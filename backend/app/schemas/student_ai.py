from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------- A. Profile Analysis ----------

class AcademicSummary(BaseModel):
    cgpa: float | None = None
    backlogs: int | None = None
    attendance_percentage: float | None = None


class ProfileAnalysisResponse(BaseModel):
    profile_completeness: float
    trust_score: float
    verified_skills: list[dict]
    unverified_skills: list[dict]
    skills_by_category: dict[str, list[str]]
    academic_summary: AcademicSummary
    certifications_count: int


# ---------- B. Dashboard ----------

class TopRecommendation(BaseModel):
    posting_id: str
    title: str
    company: str
    match_score: float


class TopSkillGap(BaseModel):
    skill: str
    gap: float
    priority: str


class DashboardResponse(BaseModel):
    status: str  # "ready" | "analysis_required"
    profile_completion: float | None = None
    industry_readiness: float | None = None
    verified_skills_count: int | None = None
    top_recommendation: TopRecommendation | None = None
    top_skill_gap: TopSkillGap | None = None
    is_placed: bool | None = None
    message: str | None = None


# ---------- C. Opportunity Matching ----------

class OpportunityMatchRequest(BaseModel):
    domain_id: str | None = None
    type: Literal["internship", "placement", "apprenticeship"] | None = Field(
        default=None,
        description="internship | placement | apprenticeship",
    )
    refresh: bool = False


class RecommendationItem(BaseModel):
    posting_id: str
    title: str
    company: str
    match_score: float
    matched_skills: list[dict]
    missing_skills: list[dict]
    reason: str


class OpportunityMatchResponse(BaseModel):
    recommendations: list[RecommendationItem]


# ---------- D. Skill Gap Analysis ----------

class SkillGapRequest(BaseModel):
    posting_id: str


class SkillGapItem(BaseModel):
    skill_id: str
    skill: str
    current_level: float
    required_level: float
    gap: float
    priority: str


class SkillGapResponse(BaseModel):
    posting_id: str
    target_title: str
    gaps: list[SkillGapItem]


# ---------- E. Improvement Simulation ----------

class SkillImprovement(BaseModel):
    skill_id: str
    target_level: float = Field(ge=0, le=100)


class SimulateImprovementRequest(BaseModel):
    posting_id: str
    skill_improvements: list[SkillImprovement]


class SkillContribution(BaseModel):
    skill_id: str
    skill: str
    current: float
    target: float
    contribution_delta: float


class SimulateImprovementResponse(BaseModel):
    posting_id: str
    current_score: float
    simulated_score: float
    delta: float
    skill_breakdown: list[SkillContribution]


# ---------- F. Applications (student side) ----------

class ApplyRequest(BaseModel):
    posting_id: str


class ApplicationItem(BaseModel):
    id: str
    posting_id: str
    title: str
    company: str
    status: str
    applied_at: str
    updated_at: str


class ApplyResponse(BaseModel):
    id: str
    posting_id: str
    status: str


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationItem]


# ---------- G. Profile edit + skills CRUD ----------

class ProfileUpdateRequest(BaseModel):
    resume_url: str | None = Field(default=None, max_length=2048)
    linkedin_url: str | None = Field(default=None, max_length=2048)
    github_url: str | None = Field(default=None, max_length=2048)
    portfolio_url: str | None = Field(default=None, max_length=2048)
    bio: str | None = Field(default=None, max_length=4000)


class ProfileUpdateResponse(BaseModel):
    id: str
    resume_url: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    bio: str | None = None


class SkillUpsertRequest(BaseModel):
    skill_id: str
    proficiency: Literal["beginner", "intermediate", "advanced"] | None = Field(
        default=None,
        description="beginner | intermediate | advanced",
    )
    proficiency_score: float = Field(ge=0, le=100)


class SkillItem(BaseModel):
    skill_id: str
    skill_name: str
    category_name: str
    proficiency: str | None = None
    proficiency_score: float
    is_verified: bool
    source: str | None = None


class SkillListResponse(BaseModel):
    skills: list[SkillItem]


class SkillDeleteResponse(BaseModel):
    skill_id: str
    deleted: bool