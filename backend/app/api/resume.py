from __future__ import annotations

import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.schemas.resume import (
    DeleteItemResponse,
    DocumentVerificationResponse,
    InternshipMatchItem,
    InternshipMatchSkill,
    ResumeIntelligenceResponse,
    ResumeListItem,
    ResumeSkillItem,
    ResumeStatusResponse,
    ResumeUploadResponse,
    StudentDocumentItem,
)
from app.services import (
    document_verification_service,
    repository as repo,
    resume_intelligence_service,
    resume_service,
)

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    data = await resume_service.process_resume_upload(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        upload_file=file,
    )

    if data["extraction_status"] == "extracted":
        repo.upsert_resume_processing_job(
            service_client,
            resume_id=data["resume_id"],
            student_id=current.student_id,
            status="pending",
        )
        background_tasks.add_task(
            resume_intelligence_service.process_resume_intelligence,
            client=current.client,
            service_client=service_client,
            student_id=current.student_id,
            resume_id=data["resume_id"],
        )

    return ResumeUploadResponse(**data)


@router.get("/list", response_model=list[ResumeListItem])
def list_resumes(
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """List all uploaded resumes for the current student."""
    t0 = time.time()
    result = resume_service.list_student_resumes(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
    )
    print(f"[PERF] GET /api/resume/list handler: {time.time() - t0:.3f}s")
    return result



@router.post("/select-active/{resume_id}")
def select_active_resume(
    resume_id: str,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Set an uploaded resume as the active resume."""
    return resume_service.select_active_resume(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        resume_id=resume_id,
    )


@router.get("/latest", response_model=ResumeStatusResponse)
def get_latest_resume(
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    data = resume_service.get_latest_resume_status(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
    )
    if data.get("resume_id"):
        job = repo.fetch_resume_processing_job(current.client, current.student_id, data["resume_id"])
        data["processing_status"] = (job or {}).get("status")
        data["processing_error"] = (job or {}).get("error_message")
    return ResumeStatusResponse(**data)


@router.get("/intelligence", response_model=ResumeIntelligenceResponse)
def get_resume_intelligence(
    current: CurrentStudent = Depends(get_current_student),
):
    """Return the latest student's extracted skills and cached internship matches."""
    resume = repo.fetch_latest_resume(current.client, current.student_id)
    if not resume:
        return ResumeIntelligenceResponse(skills=[], recommendations=[])

    job = repo.fetch_resume_processing_job(current.client, current.student_id, resume["id"])
    student_skill_rows = repo.fetch_student_skills(current.client, current.student_id)
    recommendation_rows = repo.fetch_cached_recommendations(current.client, current.student_id)

    skills = [
        ResumeSkillItem(
            skill_id=row.get("skill_id"),
            raw_skill_name=row["skill_name"],
            normalized_skill_name=row["skill_name"],
            matched_skill_name=row["skill_name"],
            skill_name=row["skill_name"],
            name=row["skill_name"],
            confidence=0.95 if row.get("is_verified") else float(row.get("source_confidence") or 0.60),
            status="verified" if row.get("is_verified") else "unverified",
            is_verified=bool(row.get("is_verified")),
            evidence_url=row.get("evidence_url"),
            extraction_confidence=0.95 if row.get("is_verified") else 0.60,
            normalization_confidence=1.0,
            source=row.get("source") or ("document_verified" if row.get("is_verified") else "ai_estimated"),
            provider="",
            model="",
            created_at="",
        )
        for row in student_skill_rows
    ]

    recommendations = [
        InternshipMatchItem(
            posting_id=row["posting_id"],
            title=(row.get("postings") or {}).get("title", "Unknown posting"),
            company=((row.get("postings") or {}).get("companies") or {}).get("name", "Unknown"),
            match_score=float(row.get("match_score") or 0),
            matched_skills=[InternshipMatchSkill(**item) for item in (row.get("matched_skills") or [])],
            missing_skills=[InternshipMatchSkill(**item) for item in (row.get("missing_skills") or [])],
            reason=row.get("reason") or "",
        )
        for row in recommendation_rows
    ]

    return ResumeIntelligenceResponse(
        resume_id=resume["id"],
        extraction_status=resume.get("extraction_status"),
        processing_status=(job or {}).get("status"),
        processing_error=(job or {}).get("error_message"),
        skills=skills,
        recommendations=recommendations,
    )


@router.post("/verify-document", response_model=DocumentVerificationResponse)
async def verify_document(
    file: UploadFile = File(...),
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Upload a certificate, project report, or transcript to corroborate resume skills and boost confidence."""
    return await document_verification_service.process_document_verification(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        upload_file=file,
    )


@router.get("/documents", response_model=list[StudentDocumentItem])
def get_student_documents(
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """List uploaded supporting proof documents and the skills they verify with preview URLs."""
    t0 = time.time()
    from app.config import get_settings
    cfg = get_settings()

    certs = repo.fetch_student_certifications(current.client, current.student_id)
    skills = repo.fetch_student_skills(current.client, current.student_id)

    out = []
    for c in certs:
        cred = c.get("credential_url")
        file_url = None
        if cred:
            if cred.startswith("http"):
                file_url = cred
            else:
                file_url = repo.create_resume_signed_url(
                    service_client,
                    cfg.SUPABASE_STORAGE_BUCKET,
                    cred,
                    cfg.RESUME_SIGNED_URL_EXPIRY_SECONDS,
                )

        doc_skills = []
        for s in skills:
            ev = s.get("evidence_url") or ""
            if cred and (ev == cred or cred in ev or (ev and ev in cred)) and s.get("is_verified"):
                doc_skills.append(s["skill_name"])

        # If no specific evidence_url match (legacy data or seeded records), fall back to verified skills
        if not doc_skills:
            doc_skills = [s["skill_name"] for s in skills if s.get("is_verified")]

        ext = (c.get("title") or "").split(".")[-1].lower() if "." in (c.get("title") or "") else "pdf"

        out.append(
            StudentDocumentItem(
                id=c.get("id", ""),
                title=c.get("title", "Document"),
                file_name=c.get("title", "Document"),
                file_type=ext,
                file_url=file_url,
                storage_path=cred,
                created_at=str(c.get("created_at") or ""),
                skills_verified=doc_skills,
            )
        )
    print(f"[PERF] GET /api/resume/documents handler: {time.time() - t0:.3f}s")
    return out


@router.delete("/documents/{document_id}", response_model=DeleteItemResponse)
def delete_document(
    document_id: str,
    delete_skills: bool = True,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Delete a certificate/proof document by ID, removing its file from Supabase storage and reverting/cleaning up corroborated skills."""
    return resume_service.delete_student_document(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        cert_id=document_id,
        delete_skills=delete_skills,
    )


@router.delete("/skills", response_model=DeleteItemResponse)
def clear_student_skills(
    scope: str = "unverified",
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Clear student skills from profile and database container.
    scope='unverified' (default): removes unverified AI resume claims while keeping verified credentials safe.
    scope='all': removes all skills (verified and unverified).
    """
    return resume_service.clear_student_skills_service(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        scope=scope,
    )


@router.delete("/skills/{skill_identifier}", response_model=DeleteItemResponse)
def delete_single_skill(
    skill_identifier: str,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Delete an individual skill from student profile and database container by its skill_id UUID or skill name."""
    return resume_service.delete_single_student_skill_service(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        skill_identifier=skill_identifier,
    )


@router.delete("/{resume_id}", response_model=DeleteItemResponse)
def delete_resume(
    resume_id: str,
    delete_skills: bool = True,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Delete a resume by ID, removing its file from Supabase storage and cleaning up extracted unverified skills."""
    return resume_service.delete_student_resume(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        resume_id=resume_id,
        delete_skills=delete_skills,
    )


