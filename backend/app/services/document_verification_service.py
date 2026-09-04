"""Document upload and skill verification engine.

Allows students to upload supporting documents (certificates, course completion
proofs, project reports, transcripts) to corroborate skills extracted from their
resumes, boosting confidence scores from an initial estimate (e.g. ~60%) to
verified (95-100%) and attaching tangible evidence.
"""
from __future__ import annotations

import io
import logging
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings
from app.deps.ai_clients import get_ai_provider
from app.schemas.resume import DocumentVerificationResponse, VerifiedSkillItem
from app.services import opportunity_service, repository as repo
from app.services.resume_text_extraction_service import (
    ResumeTextExtractionError,
    extract_resume_text,
)
from app.services.skill_normalization_service import normalize_text

logger = logging.getLogger(__name__)

_ACCEPTED_EXTENSIONS = {"pdf", "docx", "png", "jpg", "jpeg"}
_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
}
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def process_document_verification(
    *,
    client,
    service_client,
    student_id: str,
    upload_file: UploadFile,
) -> DocumentVerificationResponse:
    settings = get_settings()

    filename = (upload_file.filename or "supporting_document").strip()
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in _ACCEPTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported document type '.{ext}'. Supported: PDF, DOCX, PNG, JPG.",
        )

    file_bytes = await upload_file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Document file exceeds the 10 MB size limit.",
        )

    file_type = ext if ext in ("pdf", "docx") else "image"
    content_type = _CONTENT_TYPES.get(ext, "application/octet-stream")

    # 1. Upload supporting document to Storage
    generated_name = f"{uuid4().hex}_{filename}"
    storage_path = f"{student_id}/proofs/{generated_name}"

    try:
        repo.upload_resume_file(
            service_client,
            settings.SUPABASE_STORAGE_BUCKET,
            storage_path,
            file_bytes,
            content_type,
        )
    except Exception as exc:
        logger.exception("Failed to store verification document: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not store the supporting document. Please try again.",
        ) from exc

    # 2. Extract text from document
    extracted_text = ""
    try:
        if file_type in ("pdf", "docx"):
            extracted_text = extract_resume_text(file_type, file_bytes)
        else:
            extracted_text = _extract_image_text(file_bytes)
    except ResumeTextExtractionError:
        logger.warning("Standard text extraction failed, attempting OCR")
        try:
            extracted_text = _extract_image_text(file_bytes)
        except Exception:
            extracted_text = ""
    except Exception as exc:
        logger.warning("Could not extract text from document: %s", exc)
        extracted_text = ""

    if not extracted_text or len(extracted_text.strip()) < 10:
        # If text couldn't be extracted, use filename as basic context
        extracted_text = f"Document title: {filename}"

    # 3. Extract skills from document using AI
    doc_skills_raw: list[dict] = []
    try:
        ai_provider = get_ai_provider()
        doc_skills_raw = ai_provider.extract_skills(extracted_text)
    except Exception as exc:
        logger.warning("AI extraction from document encountered error: %s", exc)
        doc_skills_raw = []

    doc_skill_names = [
        item.get("skill_name")
        for item in doc_skills_raw
        if isinstance(item, dict) and item.get("skill_name")
    ]

    # 4. Fetch current student skills and canonical skills catalog
    existing_skills = repo.fetch_student_skills(client, student_id)
    existing_skill_map = {
        normalize_text(s["skill_name"]): s for s in existing_skills
    }

    all_canonical = repo.fetch_all_skills(client)
    canonical_map = {
        normalize_text(s["name"]): s for s in all_canonical
    }

    verified_items: list[VerifiedSkillItem] = []
    verified_names: set[str] = set()

    for raw_name in doc_skill_names:
        norm_name = normalize_text(raw_name)
        # Find matching student skill
        matched_existing = existing_skill_map.get(norm_name)
        if not matched_existing:
            # Check fuzzy / partial containment
            for existing_norm, existing_obj in existing_skill_map.items():
                if norm_name in existing_norm or existing_norm in norm_name:
                    matched_existing = existing_obj
                    break

        if matched_existing and matched_existing["skill_name"] not in verified_names:
            skill_id = matched_existing["skill_id"]
            skill_name = matched_existing["skill_name"]
            was_verified = bool(matched_existing.get("is_verified"))
            old_confidence = 0.95 if was_verified else 0.60

            # Boost and verify the skill in student_skills
            repo.upsert_verified_student_skill(
                service_client,
                student_id=student_id,
                skill_id=skill_id,
                proficiency_score=95.0,
                proficiency_label="advanced",
                evidence_url=storage_path,
            )

            verified_names.add(skill_name)
            verified_items.append(
                VerifiedSkillItem(
                    skill_name=skill_name,
                    previous_confidence=old_confidence,
                    new_confidence=0.95,
                    is_verified=True,
                    status="already_verified" if was_verified else "newly_verified",
                )
            )

        elif not matched_existing:
            # If skill was not on the resume but is in canonical catalog, add it as verified!
            matched_canonical = canonical_map.get(norm_name)
            if not matched_canonical:
                for c_norm, c_obj in canonical_map.items():
                    if norm_name in c_norm or c_norm in norm_name:
                        matched_canonical = c_obj
                        break

            if matched_canonical and matched_canonical["name"] not in verified_names:
                skill_id = matched_canonical["id"]
                skill_name = matched_canonical["name"]
                repo.upsert_verified_student_skill(
                    service_client,
                    student_id=student_id,
                    skill_id=skill_id,
                    proficiency_score=90.0,
                    proficiency_label="advanced",
                    evidence_url=storage_path,
                )
                verified_names.add(skill_name)
                verified_items.append(
                    VerifiedSkillItem(
                        skill_name=skill_name,
                        previous_confidence=0.0,
                        new_confidence=0.95,
                        is_verified=True,
                        status="corroborated",
                    )
                )

    # 5. Record document in certifications log
    cert = repo.insert_certification(
        service_client,
        student_id=student_id,
        title=filename,
        issuing_organization="Supporting Document",
        credential_url=storage_path,
        is_verified=True,
    )

    # 6. Recompute opportunity matching with fresh verified skills
    try:
        opportunity_service.match_opportunities(
            client=client,
            service_client=service_client,
            student_id=student_id,
            refresh=True,
        )
    except Exception as exc:
        logger.warning("Could not refresh opportunity matches after verification: %s", exc)

    msg = (
        f"Verified {len(verified_items)} skill(s) from '{filename}' with confidence boosted to 95%."
        if verified_items
        else f"Document '{filename}' uploaded successfully. No direct overlapping skills matched existing profile claims."
    )

    return DocumentVerificationResponse(
        document_id=cert.get("id") or str(uuid4()),
        file_name=filename,
        file_type=ext,
        file_size=len(file_bytes),
        storage_path=storage_path,
        extracted_skills_count=len(doc_skill_names),
        verified_skills_count=len(verified_items),
        verified_skills=verified_items,
        all_extracted_skills=doc_skill_names,
        message=msg,
    )


def _extract_image_text(file_bytes: bytes) -> str:
    """OCR fallback for images using pytesseract and PIL."""
    try:
        import pytesseract
        from PIL import Image

        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image)
    except Exception as exc:
        logger.warning("Image OCR not available or failed: %s", exc)
        return ""
