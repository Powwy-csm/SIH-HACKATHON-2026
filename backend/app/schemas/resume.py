from __future__ import annotations

from pydantic import BaseModel, Field


class ResumeUploadResponse(BaseModel):
    resume_id: str
    file_name: str
    file_type: str                      # "pdf" | "docx"
    file_size: int                      # bytes
    extraction_status: str              # "extracted" | "failed"
    processing_status: str | None = None  # pending until the background pipeline starts
    extraction_error: str | None = None
    resume_url: str | None = None       # short-lived signed download URL; never persisted
    extracted_text_preview: str | None = None
    message: str


class ResumeStatusResponse(BaseModel):
    """Returned by GET /api/resume/latest."""
    resume_id: str | None = None
    file_name: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    extraction_status: str | None = None
    processing_status: str | None = None
    extraction_error: str | None = None
    processing_error: str | None = None
    resume_url: str | None = None
    extracted_text_preview: str | None = None
    uploaded_at: str | None = None


class ResumeSkillItem(BaseModel):
    raw_skill_name: str
    normalized_skill_name: str | None = None
    matched_skill_name: str | None = None
    skill_name: str | None = None
    name: str | None = None
    confidence: float | None = None
    status: str
    is_verified: bool = False
    evidence_url: str | None = None
    extraction_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    normalization_confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    source: str
    provider: str
    model: str
    created_at: str


class InternshipMatchSkill(BaseModel):
    skill_id: str
    skill: str
    score: float | None = None
    gap: float | None = None


class InternshipMatchItem(BaseModel):
    posting_id: str
    title: str
    company: str
    match_score: float = Field(ge=0.0, le=100.0)
    matched_skills: list[InternshipMatchSkill]
    missing_skills: list[InternshipMatchSkill]
    reason: str


class ResumeIntelligenceResponse(BaseModel):
    resume_id: str | None = None
    extraction_status: str | None = None
    processing_status: str | None = None
    processing_error: str | None = None
    skills: list[ResumeSkillItem]
    recommendations: list[InternshipMatchItem]


class VerifiedSkillItem(BaseModel):
    skill_name: str
    previous_confidence: float
    new_confidence: float
    is_verified: bool
    status: str


class DocumentVerificationResponse(BaseModel):
    document_id: str
    file_name: str
    file_type: str
    file_size: int
    storage_path: str
    extracted_skills_count: int
    verified_skills_count: int
    verified_skills: list[VerifiedSkillItem]
    all_extracted_skills: list[str]
    message: str


class StudentDocumentItem(BaseModel):
    id: str
    title: str
    file_name: str
    storage_path: str | None = None
    created_at: str | None = None
    skills_verified: list[str] = []
