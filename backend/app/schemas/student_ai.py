from __future__ import annotations

from pydantic import BaseModel, Field


class VerifiedSkill(BaseModel):
    skill_id: str
    skill: str
    proficiency: str | None = None


class UnverifiedSkill(BaseModel):
    skill_id: str
    skill: str
    proficiency: str | None = None


class AcademicSummary(BaseModel):
    cgpa: float | None = None
    backlogs: int | None = None
    attendance_percentage: float | None = None


class ProfileAnalysisResponse(BaseModel):
    profile_completeness: int
    trust_score: float
    verified_skills: list[VerifiedSkill]
    unverified_skills: list[UnverifiedSkill]
    skills_by_category: dict[str, list[str]]
    academic_summary: AcademicSummary
    certifications_count: int


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
    status: str
    profile_completion: int
    message: str | None = None
    industry_readiness: float | None = None
    verified_skills_count: int | None = None
    top_recommendation: TopRecommendation | None = None
    top_skill_gap: TopSkillGap | None = None
    is_placed: bool | None = None


class OpportunityMatchRequest(BaseModel):
    domain_id: str | None = None
    type: str | None = None
    refresh: bool = False


class OpportunitySkillItem(BaseModel):
    skill_id: str
    skill: str
    score: float | None = None
    gap: float | None = None


class OpportunityItem(BaseModel):
    posting_id: str
    title: str
    company: str
    match_score: float
    matched_skills: list[OpportunitySkillItem]
    missing_skills: list[OpportunitySkillItem]
    reason: str


class OpportunityMatchResponse(BaseModel):
    recommendations: list[OpportunityItem]


class SkillGapRequest(BaseModel):
    posting_id: str = Field(min_length=1)


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


class SkillImprovement(BaseModel):
    skill_id: str = Field(min_length=1)
    target_level: float


class SimulateImprovementRequest(BaseModel):
    posting_id: str = Field(min_length=1)
    skill_improvements: list[SkillImprovement]


class SimulatedSkillBreakdown(BaseModel):
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
    skill_breakdown: list[SimulatedSkillBreakdown]


class StudentProfileUpdateRequest(BaseModel):
    bio: str | None = Field(default=None, max_length=2000)
    linkedin_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    portfolio_url: str | None = Field(default=None, max_length=500)


class StudentProfileUpdateResponse(BaseModel):
    id: str
    bio: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
