from __future__ import annotations

from pydantic import BaseModel


class InstitutionProfileResponse(BaseModel):
    id: str
    name: str
    admin_profile_id: str | None = None


class SkillGapAggregate(BaseModel):
    skill: str
    avg_gap: float
    student_count: int


class InstitutionDashboardResponse(BaseModel):
    institution_name: str
    total_students: int
    placed_students: int
    placement_rate: float
    top_skill_gaps: list[SkillGapAggregate]
    open_postings_count: int
