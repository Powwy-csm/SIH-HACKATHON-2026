"""End-to-end asynchronous resume intelligence pipeline.

Pipeline:

    resume text
        -> Gemini skill extraction
        -> canonical skill normalization
        -> student_skills persistence
        -> optional profile embedding
        -> internship/opportunity matching
        -> durable processing status

Important:
- Resume skill extraction/normalization is required.
- Profile embeddings are OPTIONAL.
- Internship matching is attempted even when embeddings fail.
- Expected optional-service/database failures must not kill the entire pipeline.
- The processing job always receives a durable final status.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.deps.ai_clients import get_ai_provider
from app.services import (
    embedding_service,
    opportunity_service,
    profile_document_service,
    repository as repo,
    skill_extraction_service,
    skill_normalization_service,
)
from app.services.skill_extraction_service import SkillExtractionError

logger = logging.getLogger(__name__)



def _utc_now() -> str:
    """Return the current UTC timestamp as an ISO string."""
    return datetime.now(timezone.utc).isoformat()


def _safe_error(exc: Exception) -> str:
    """Return a short, safe error message suitable for DB persistence."""
    message = str(exc).strip()

    if not message:
        message = exc.__class__.__name__

    return message[:500]


def process_resume_intelligence(
    *,
    client,
    service_client,
    student_id: str,
    resume_id: str,
) -> None:
    """Run the complete resume intelligence pipeline.

    The pipeline intentionally separates critical and non-critical stages.

    Critical:
        - Resume lookup
        - Gemini skill extraction
        - Skill normalization/storage

    Non-critical:
        - Profile embedding generation
        - Internship matching

    If embedding fails, matching still runs.

    If matching fails, the job becomes completed_with_errors.

    If a critical stage fails, the job becomes failed.
    """

    # ---------------------------------------------------------
    # Mark job as processing
    # ---------------------------------------------------------
    t_pipeline = time.perf_counter()
    try:
        repo.upsert_resume_processing_job(
            service_client,
            resume_id=resume_id,
            student_id=student_id,
            status="processing",
            error=None,
            started_at=_utc_now(),
        )
    except Exception:
        # If we cannot even update the processing status, there is no
        # useful recovery path here. Still log the error and continue
        # because the actual pipeline may provide a more useful failure.
        logger.exception(
            "Could not mark resume processing job as processing: %s",
            resume_id,
        )

    try:
        settings = get_settings()

        # -----------------------------------------------------
        # 1. Fetch extracted resume text
        # -----------------------------------------------------
        t_fetch = time.perf_counter()
        resume = repo.fetch_resume_for_student(
            service_client,
            student_id,
            resume_id,
        )
        logger.info("[PERF] Stage 1 resume fetch: %.3fs", time.perf_counter() - t_fetch)

        if not resume:
            raise ValueError(
                "Resume record was not found for the authenticated student."
            )

        extraction_status = resume.get("extraction_status")
        extracted_text = (resume.get("extracted_text") or "").strip()

        if extraction_status != "extracted":
            raise ValueError(
                f"Resume extraction is not complete. "
                f"Current status: {extraction_status or 'unknown'}."
            )

        if not extracted_text:
            raise ValueError(
                "Resume text is empty. AI processing cannot continue."
            )

        # -----------------------------------------------------
        # 2. Initialize AI provider
        # -----------------------------------------------------
        ai_provider = get_ai_provider()

        # -----------------------------------------------------
        # 3. Gemini skill extraction
        # -----------------------------------------------------
        logger.info(
            "Starting Gemini skill extraction: student=%s resume=%s text_chars=%d",
            student_id,
            resume_id,
            len(extracted_text),
        )

        t_extract = time.perf_counter()
        try:
            extracted_items = skill_extraction_service.extract_skills(
                extracted_text,
                ai_provider,
            )
        except SkillExtractionError:
            logger.exception(
                "Gemini skill extraction failed for resume %s",
                resume_id,
            )
            raise
        except Exception:
            logger.exception(
                "Unexpected skill extraction failure for resume %s",
                resume_id,
            )
            raise

        if extracted_items is None:
            raise ValueError(
                "AI skill extraction returned no result."
            )

        if not isinstance(extracted_items, list):
            raise ValueError(
                "AI skill extraction returned an invalid result."
            )

        logger.info(
            "[PERF] Stage 3 Gemini skill extraction: skills=%s time=%.3fs",
            len(extracted_items),
            time.perf_counter() - t_extract,
        )

        # -----------------------------------------------------
        # 4. Normalize skills + persist student_skills
        # -----------------------------------------------------
        logger.info(
            "Starting skill normalization: student=%s resume=%s",
            student_id,
            resume_id,
        )

        t_norm = time.perf_counter()
        norm_result = skill_normalization_service.normalize_and_store(
            client=client,
            service_client=service_client,
            student_id=student_id,
            resume_id=resume_id,
            extracted_items=extracted_items,
            fuzzy_threshold=settings.SKILL_FUZZY_MATCH_THRESHOLD,
            min_normalization_confidence=(
                settings.SKILL_MIN_NORMALIZATION_CONFIDENCE
            ),
            ai_default_proficiency_score=(
                settings.AI_SKILL_DEFAULT_PROFICIENCY_SCORE
            ),
            ai_default_proficiency_label=(
                settings.AI_SKILL_DEFAULT_PROFICIENCY_LABEL
            ),
            provider_name=ai_provider.name,
            model_name=ai_provider.skill_extraction_model,
        )

        if not isinstance(norm_result, dict):
            norm_result = {}

        logger.info(
            "[PERF] Stage 4 skill normalization+DB writes: matched=%s unmatched=%s time=%.3fs",
            norm_result.get("matched", 0),
            norm_result.get("unmatched", 0),
            time.perf_counter() - t_norm,
        )

        # -----------------------------------------------------
        # 5. OPTIONAL: Profile embedding
        # -----------------------------------------------------
        #
        # This entire operation is intentionally wrapped.
        #
        # We do NOT allow:
        #
        #   missing student_embeddings table
        #   permission error
        #   Gemini embedding failure
        #   network failure
        #   malformed embedding
        #
        # to fail the resume intelligence pipeline.
        #
        t_embed = time.perf_counter()
        embedding_error = _refresh_profile_embedding(
            client=client,
            service_client=service_client,
            student_id=student_id,
            resume_id=resume_id,
            extracted_text=extracted_text,
            ai_provider=ai_provider,
        )
        logger.info(
            "[PERF] Stage 5 profile embedding: error=%s time=%.3fs",
            embedding_error or "none",
            time.perf_counter() - t_embed,
        )

        # -----------------------------------------------------
        # 6. Internship / opportunity matching
        # -----------------------------------------------------
        matching_error: str | None = None

        try:
            logger.info(
                "Starting internship matching: student=%s resume=%s",
                student_id,
                resume_id,
            )

            t_match = time.perf_counter()
            opportunity_service.match_opportunities(
                client=client,
                service_client=service_client,
                student_id=student_id,
                refresh=True,
            )

            logger.info(
                "[PERF] Stage 6 internship matching: time=%.3fs",
                time.perf_counter() - t_match,
            )

        except Exception as exc:
            matching_error = _safe_error(exc)

            logger.exception(
                "Internship matching failed for resume %s",
                resume_id,
            )

        # -----------------------------------------------------
        # 7. Determine final durable status
        # -----------------------------------------------------
        errors: list[str] = []

        if embedding_error:
            errors.append(
                f"Profile embedding skipped: {embedding_error}"
            )

        if matching_error:
            errors.append(
                f"Internship matching failed: {matching_error}"
            )

        if errors:
            final_status = "completed_with_errors"
            final_error = " | ".join(errors)
        else:
            final_status = "completed"
            final_error = None

        # -----------------------------------------------------
        # 8. Persist successful/completed status
        # -----------------------------------------------------
        try:
            repo.upsert_resume_processing_job(
                service_client,
                resume_id=resume_id,
                student_id=student_id,
                status=final_status,
                error=final_error,
                provider=ai_provider.name,
                model=ai_provider.skill_extraction_model,
                completed_at=_utc_now(),
            )
        except Exception:
            logger.exception(
                "Could not persist final resume processing status: "
                "resume=%s",
                resume_id,
            )

        logger.info(
            "[PERF] Pipeline TOTAL: student=%s resume=%s extracted=%s matched=%s "
            "unmatched=%s embedding_error=%s matching_error=%s status=%s total=%.3fs",
            student_id,
            resume_id,
            len(extracted_items),
            norm_result.get("matched", 0),
            norm_result.get("unmatched", 0),
            bool(embedding_error),
            bool(matching_error),
            final_status,
            time.perf_counter() - t_pipeline,
        )

    # ---------------------------------------------------------
    # CRITICAL PIPELINE FAILURE
    # ---------------------------------------------------------
    except Exception as exc:
        error = _safe_error(exc)

        logger.exception(
            "Resume intelligence failed for resume %s",
            resume_id,
        )

        try:
            repo.upsert_resume_processing_job(
                service_client,
                resume_id=resume_id,
                student_id=student_id,
                status="failed",
                error=error,
                completed_at=_utc_now(),
            )
        except Exception:
            logger.exception(
                "Could not persist failed resume processing status: "
                "resume=%s",
                resume_id,
            )


def _refresh_profile_embedding(
    *,
    client,
    service_client,
    student_id: str,
    resume_id: str,
    extracted_text: str,
    ai_provider,
) -> str | None:
    """Refresh the profile embedding when the embedding infrastructure exists.

    Embeddings are explicitly OPTIONAL.

    Returns:
        None when embedding succeeds.
        A short error string when embedding is skipped or fails.

    This function deliberately catches ALL exceptions because the current
    database schema may not contain the optional student_embeddings table.
    """

    try:
        # -----------------------------------------------------
        # Fetch student information in ONE query (was 5 queries)
        # -----------------------------------------------------
        t_data = time.perf_counter()
        comprehensive = repo.fetch_comprehensive_student_data(client, student_id)

        if comprehensive:
            # Unpack the joined result — keys match the comprehensive query select
            student_row = comprehensive
            all_matched_skills = [
                {
                    "skill_name": (ss.get("skills") or {}).get("name", ""),
                    "skill_id": ss.get("skill_id"),
                    "is_verified": ss.get("is_verified", False),
                    "proficiency_score": ss.get("proficiency_score"),
                }
                for ss in (comprehensive.get("student_skills") or [])
            ]
            domain_name = (comprehensive.get("domains") or {}).get("name")
            # Academic records are not included in fetch_comprehensive_student_data;
            # fetch separately only when needed (single call, lightweight).
            academic_record = repo.fetch_academic_records(client, student_id)
            certification_titles = repo.fetch_certification_titles(client, student_id)
        else:
            # Fallback: individual queries (original approach)
            logger.warning(
                "fetch_comprehensive_student_data returned empty for %s — "
                "falling back to individual queries",
                student_id,
            )
            student_row = repo.fetch_student_row(client, student_id) or {}
            all_matched_skills = repo.fetch_student_skills(client, student_id)
            domain_name = repo.fetch_domain_name(client, student_row.get("domain_id"))
            academic_record = repo.fetch_academic_records(client, student_id)
            certification_titles = repo.fetch_certification_titles(client, student_id)

        logger.info(
            "[PERF] embedding data-fetch: student=%s time=%.3fs",
            student_id,
            time.perf_counter() - t_data,
        )

        # -----------------------------------------------------
        # Build profile document
        # -----------------------------------------------------
        profile_document = profile_document_service.build_profile_document(
            domain_name=domain_name,
            bio=(student_row.get("bio") if isinstance(student_row, dict) else None),
            matched_skill_names=[
                skill["skill_name"]
                for skill in all_matched_skills
                if skill.get("skill_name")
            ],
            academic_record=academic_record,
            certification_titles=certification_titles,
            resume_extracted_text=extracted_text,
        )

        if not profile_document or not profile_document.strip():
            return "Profile document is empty."

        # -----------------------------------------------------
        # Generate/store embedding
        # -----------------------------------------------------
        logger.info(
            "Generating profile embedding: student=%s resume=%s doc_chars=%d",
            student_id,
            resume_id,
            len(profile_document),
        )

        t_ai = time.perf_counter()
        embedding_service.get_or_create_embedding(
            client=client,
            service_client=service_client,
            student_id=student_id,
            profile_document=profile_document,
            ai_provider=ai_provider,
            source_version=resume_id,
        )
        logger.info(
            "[PERF] embedding AI call: student=%s time=%.3fs",
            student_id,
            time.perf_counter() - t_ai,
        )

        return None

    except Exception as exc:
        error = _safe_error(exc)

        # IMPORTANT:
        # Do NOT re-raise.
        #
        # The embedding infrastructure is optional and must never prevent
        # skill extraction/normalization or internship matching.
        logger.warning(
            "Profile embedding skipped/failed for student=%s "
            "resume=%s: %s",
            student_id,
            resume_id,
            error,
        )

        return error
