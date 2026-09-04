from __future__ import annotations

from pydantic import BaseModel, Field


class ExtractedSkillItem(BaseModel):
    """Validated shape of one skill the AI provider returned. Anything
    that doesn't fit this — wrong types, missing fields, out-of-range
    confidence — is rejected before it ever touches the database."""

    skill_name: str = Field(min_length=1, max_length=200)
    confidence: float = Field(ge=0.0, le=1.0)


class SkillCandidateSummary(BaseModel):
    raw_skill_name: str
    normalized_skill_name: str | None = None
    matched_skill_name: str | None = None
    status: str  # matched | unmatched | rejected
    extraction_confidence: float | None = None
    normalization_confidence: float | None = None
    note: str | None = None


class ProcessAIResponse(BaseModel):
    resume_id: str
    processing_status: str  # "completed" | "completed_with_embedding_error"
    skills_extracted: int
    skills_matched: int
    skills_unmatched: int
    embedding_generated: bool
    embedding_error: str | None = None
    candidates: list[SkillCandidateSummary]
    message: str


class StudentSkillsViewItem(BaseModel):
    raw_skill_name: str
    matched_skill_name: str | None = None
    status: str
    extraction_confidence: float | None = None
    normalization_confidence: float | None = None
    source: str
    provider: str
    model: str
    created_at: str


class StudentSkillsViewResponse(BaseModel):
    resume_id: str | None = None
    candidates: list[StudentSkillsViewItem]
