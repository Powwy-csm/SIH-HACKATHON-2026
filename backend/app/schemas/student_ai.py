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


class SkillItem(BaseModel):
    skill_id: str
    skill_name: str
    category_name: str | None = None
    proficiency: str | None = None
    proficiency_score: float | None = None
    self_report_score: float | None = None
    assessment_score: float | None = None
    evidence_score: float | None = None
    is_verified: bool = False
    source: str | None = None
    evidence_url: str | None = None
    source_confidence: float | None = None


class AcademicRecord(BaseModel):
    semester: int | None = None
    cgpa_till_date: float | None = None
    backlogs: int | None = None
    attendance_percentage: float | None = None


class ProjectItem(BaseModel):
    id: str
    student_id: str
    title: str
    description: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    tags: list[str] = []
    project_url: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

class ProfileAnalysisResponse(BaseModel):
    profile_completeness: int
    trust_score: float
    # Domain hierarchy
    bio: str | None = None
    domain: str | None = None
    domain_id: str | None = None
    subdomain: str | None = None
    subdomain_id: str | None = None
    interest: str | None = None
    interest_id: str | None = None
    # Skills — full list, each entry has source/score info
    skills: list[SkillItem] = []
    verified_skills: list[VerifiedSkill] = []
    skills_by_category: dict[str, list[str]] = {}
    projects: list[ProjectItem] = []
    academic_record: AcademicRecord | None = None
    certifications_count: int = 0


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
