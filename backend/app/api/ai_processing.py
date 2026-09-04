from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.deps.ai_clients import get_ai_provider
from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.schemas.ai_processing import (
    ProcessAIResponse,
    StudentSkillsViewItem,
    StudentSkillsViewResponse,
)
from app.services import embedding_service, profile_document_service, repository as repo
from app.services import skill_extraction_service, skill_normalization_service
from app.services.skill_extraction_service import SkillExtractionError
from app.services.embedding_service import EmbeddingError

router = APIRouter(prefix="/api/resume", tags=["ai-processing"])


@router.post("/process-ai", response_model=ProcessAIResponse)
async def process_resume_ai(
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    settings = get_settings()
    client = current.client
    student_id = current.student_id

    # 1. Find the latest successfully extracted resume. MUST use
    # resumes.extracted_text — never re-download/re-parse the file.
    resume = repo.fetch_latest_resume(client, student_id)
    if not resume or resume.get("extraction_status") != "extracted" or not resume.get("extracted_text"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No successfully extracted resume found. Upload a resume and wait for extraction to finish first.",
        )
    resume_id = resume["id"]
    extracted_text = resume["extracted_text"]

    # 2. AI provider (configurable — see app/deps/ai_clients.py)
    ai_provider = get_ai_provider()

    # 3. Skill extraction
    try:
        extracted_items = skill_extraction_service.extract_skills(extracted_text, ai_provider)
    except SkillExtractionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    # 4. Normalize + store extraction history + safely update student_skills
    norm_result = skill_normalization_service.normalize_and_store(
        client=client,
        service_client=service_client,
        student_id=student_id,
        resume_id=resume_id,
        extracted_items=extracted_items,
        fuzzy_threshold=settings.SKILL_FUZZY_MATCH_THRESHOLD,
        min_normalization_confidence=settings.SKILL_MIN_NORMALIZATION_CONFIDENCE,
        ai_default_proficiency_score=settings.AI_SKILL_DEFAULT_PROFICIENCY_SCORE,
        ai_default_proficiency_label=settings.AI_SKILL_DEFAULT_PROFICIENCY_LABEL,
        provider_name=ai_provider.name,
        model_name=ai_provider.skill_extraction_model,
    )

    # 5. Build the deterministic profile document from canonical data —
    # never raw DB JSON, never only the AI's own claims.
    student_row = repo.fetch_student_row(client, student_id) or {}
    all_matched_skills = repo.fetch_student_skills(client, student_id)
    domain_name = repo.fetch_domain_name(client, student_row.get("domain_id"))
    academic_record = repo.fetch_academic_records(client, student_id)
    certification_titles = repo.fetch_certification_titles(client, student_id)

    profile_document = profile_document_service.build_profile_document(
        domain_name=domain_name,
        bio=student_row.get("bio"),
        matched_skill_names=[s["skill_name"] for s in all_matched_skills],
        academic_record=academic_record,
        certification_titles=certification_titles,
        resume_extracted_text=extracted_text,
    )

    # 6. Embedding — generate only if content changed. A failure here must
    # NOT roll back or hide the skill extraction work already done above.
    embedding_generated = False
    embedding_error: str | None = None
    processing_status = "completed"
    try:
        embed_result = embedding_service.get_or_create_embedding(
            client=client,
            service_client=service_client,
            student_id=student_id,
            profile_document=profile_document,
            ai_provider=ai_provider,
            source_version=resume_id,
        )
        embedding_generated = embed_result["generated"]
    except EmbeddingError as exc:
        embedding_error = str(exc)
        processing_status = "completed_with_embedding_error"

    message = "Resume analyzed and skills updated successfully."
    if processing_status == "completed_with_embedding_error":
        message = "Skills were extracted and updated, but profile embedding generation failed."

    return ProcessAIResponse(
        resume_id=resume_id,
        processing_status=processing_status,
        skills_extracted=len(extracted_items),
        skills_matched=norm_result["matched"],
        skills_unmatched=norm_result["unmatched"],
        embedding_generated=embedding_generated,
        embedding_error=embedding_error,
        candidates=norm_result["candidates"],
        message=message,
    )


@router.get("/skills", response_model=StudentSkillsViewResponse)
async def get_extracted_skills(
    current: CurrentStudent = Depends(get_current_student),
):
    """Read-only view of the AI extraction/normalization history, for the
    frontend to display what the last analysis found."""
    rows = repo.fetch_skill_candidates(current.client, current.student_id)

    items = [
        StudentSkillsViewItem(
            raw_skill_name=row["raw_skill_name"],
            matched_skill_name=(row.get("skills") or {}).get("name") if row.get("skills") else None,
            status=row["status"],
            extraction_confidence=row.get("extraction_confidence"),
            normalization_confidence=row.get("normalization_confidence"),
            source=row.get("source") or "ai_estimated",
            provider=row.get("provider") or "",
            model=row.get("model") or "",
            created_at=str(row.get("created_at") or ""),
        )
        for row in rows
    ]
    latest_resume_id = rows[0]["resume_id"] if rows else None

    return StudentSkillsViewResponse(resume_id=latest_resume_id, candidates=items)
