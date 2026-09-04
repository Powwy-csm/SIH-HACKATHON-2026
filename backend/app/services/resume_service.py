"""
Phase 1: resume upload + text extraction.

Flow (see app/api/resume.py):
    authenticate student (already done by the caller, via get_current_student)
    -> validate file (extension + magic bytes + size, never the frontend alone)
    -> upload to Supabase Storage (service-role client, server-derived path)
    -> create resumes metadata record (status="uploaded")
    -> extract text (pypdf / python-docx, with OCR fallback for scanned PDFs)
    -> update extraction status ("extracted" or "failed")
    -> update students.resume_url
    -> return a structured response (extraction failures are recorded without
       discarding the uploaded file)

AI skill extraction and internship matching are deliberately scheduled by
app/api/resume.py as a FastAPI BackgroundTask after successful extraction, so
the upload response is not blocked by Gemini/matching work.
"""
from __future__ import annotations

import asyncio
import logging
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from app.config import get_settings
from app.services import repository as repo
from app.services.resume_text_extraction_service import (
    ResumeTextExtractionError,
    extract_resume_text,
)

logger = logging.getLogger(__name__)

_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_PDF_MAGIC = b"%PDF-"
_DOCX_MAGIC = b"PK\x03\x04"  # DOCX is a zip archive


async def process_resume_upload(
    client,
    service_client,
    student_id: str,
    upload_file: UploadFile,
) -> dict:
    settings = get_settings()

    filename = (upload_file.filename or "resume").strip()
    if not filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file has no filename.")

    file_bytes = await _read_within_limit(upload_file, settings.RESUME_MAX_FILE_SIZE_BYTES)
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    file_type = _detect_file_type(filename, upload_file.content_type, file_bytes)

    generated_name = f"{uuid4().hex}.{file_type}"
    storage_path = f"{student_id}/resumes/{generated_name}"
    content_type = _CONTENT_TYPES[file_type]

    upload_ok = False
    last_upload_exc = None
    for attempt in range(3):
        try:
            repo.upload_resume_file(service_client, settings.SUPABASE_STORAGE_BUCKET, storage_path, file_bytes, content_type)
            upload_ok = True
            break
        except Exception as exc:
            last_upload_exc = exc
            logger.warning("Storage upload attempt %s failed for %s: %s", attempt + 1, storage_path, exc)
            if attempt < 2:
                await asyncio.sleep(0.5 * (attempt + 1))

    if not upload_ok:
        logger.exception("Failed to upload resume to storage after retries: %s", last_upload_exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not upload the resume to storage. Please try again.",
        ) from last_upload_exc

    record = repo.insert_resume_record(
        service_client, student_id, storage_path, filename, file_type, len(file_bytes)
    )
    resume_id = record.get("resume_id") or record.get("id")
    if not resume_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Resume was uploaded but its metadata record could not be created.",
        )

    repo.update_resume_extraction(service_client, resume_id, status="extracting")

    extracted_text: str | None = None
    extraction_error: str | None = None
    try:
        extracted_text = extract_resume_text(file_type, file_bytes)
        if not extracted_text or not extracted_text.strip():
            raise ResumeTextExtractionError("No usable text was extracted from this file.")
        extracted_text = extracted_text[: settings.MAX_EXTRACTED_TEXT_CHARS]
        repo.update_resume_extraction(service_client, resume_id, status="extracted", extracted_text=extracted_text)
        final_status = "extracted"
    except Exception as exc:
        extraction_error = str(exc)[:500]
        repo.update_resume_extraction(service_client, resume_id, status="failed", error=extraction_error)
        final_status = "failed"

    # The file itself is safely stored either way — extraction failing
    # doesn't mean the upload failed, so students.resume_url still points
    # at it. (Per the approved decision: this is a private storage_path,
    # not a public URL — see repo.update_student_resume_url docstring.)
    repo.update_student_resume_url(service_client, student_id, storage_path)

    signed_url = repo.create_resume_signed_url(
        service_client, settings.SUPABASE_STORAGE_BUCKET, storage_path, settings.RESUME_SIGNED_URL_EXPIRY_SECONDS
    )

    return {
        "resume_id": resume_id,
        "file_name": filename,
        "file_type": file_type,
        "file_size": len(file_bytes),
        "extraction_status": final_status,
        "processing_status": ("pending" if final_status == "extracted" else None),
        "extraction_error": extraction_error,
        "resume_url": signed_url,
        "extracted_text_preview": (extracted_text[:300] if extracted_text else None),
        "message": (
            "Resume uploaded and processed successfully."
            if final_status == "extracted"
            else "Resume uploaded, but we couldn't extract its text. You can try re-uploading."
        ),
    }


def get_latest_resume_status(client, service_client, student_id: str) -> dict:
    row = repo.fetch_latest_resume(client, student_id)
    if not row:
        return {
            "resume_id": None,
            "file_name": None,
            "file_type": None,
            "file_size": None,
            "extraction_status": None,
            "extraction_error": None,
            "resume_url": None,
            "extracted_text_preview": None,
            "uploaded_at": None,
        }

    settings = get_settings()
    signed_url = repo.create_resume_signed_url(
        service_client, settings.SUPABASE_STORAGE_BUCKET, row["storage_path"], settings.RESUME_SIGNED_URL_EXPIRY_SECONDS
    )
    extracted_text = row.get("extracted_text")

    return {
        "resume_id": row["id"],
        "file_name": row["file_name"],
        "file_type": row["file_type"],
        "file_size": row["file_size"],
        "extraction_status": row["extraction_status"],
        "extraction_error": row.get("extraction_error"),
        "resume_url": signed_url,
        "extracted_text_preview": (extracted_text[:300] if extracted_text else None),
        "uploaded_at": row.get("created_at"),
    }


# ---------------------------------------------------------------------
# Validation — never trust the frontend's extension/content-type alone.
# ---------------------------------------------------------------------

async def _read_within_limit(upload_file: UploadFile, max_bytes: int) -> bytes:
    """Reads the upload in chunks, rejecting it as soon as it exceeds
    max_bytes, instead of buffering an arbitrarily large file into memory
    first."""
    chunks: list[bytes] = []
    total = 0
    chunk_size = 1024 * 1024  # 1 MB
    while True:
        chunk = await upload_file.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds the maximum allowed size of {max_bytes // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def _detect_file_type(filename: str, declared_content_type: str | None, file_bytes: bytes) -> str:
    """Extension AND file-signature (magic bytes) must both check out.
    declared_content_type from the client is informational only — it is
    never trusted on its own, since browsers/clients can send anything."""
    settings = get_settings()
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in settings.RESUME_ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and DOCX resumes are accepted.",
        )

    if ext == "pdf":
        if not file_bytes.startswith(_PDF_MAGIC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This file's contents don't look like a valid PDF.",
            )
    else:  # docx
        if not file_bytes.startswith(_DOCX_MAGIC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This file's contents don't look like a valid DOCX.",
            )

    return ext
