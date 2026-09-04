from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CompanyProfileResponse(BaseModel):
    id: str
    name: str
    admin_profile_id: str | None = None


class RequiredSkillInput(BaseModel):
    skill_id: str
    required_level: float = Field(ge=0, le=100)
    # Literal (not free-text) so a bad value 422s cleanly instead of
    # reaching the posting_required_skills.importance check constraint
    # and surfacing as an unhandled 500.
    importance: Literal["low", "medium", "high"] = "medium"


class PostingCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    domain_id: str | None = None
    type: Literal["internship", "placement", "apprenticeship"] = "internship"
    required_skills: list[RequiredSkillInput] = Field(default_factory=list)


class PostingItem(BaseModel):
    id: str
    title: str
    company_id: str
    domain_id: str | None = None
    type: str
    status: str


class PostingListResponse(BaseModel):
    postings: list[PostingItem]


class PostingStatusUpdateRequest(BaseModel):
    status: Literal["open", "closed"]


class ApplicantItem(BaseModel):
    id: str
    student_id: str
    posting_id: str
    posting_title: str
    status: str
    applied_at: str


class ApplicantListResponse(BaseModel):
    applicants: list[ApplicantItem]


class ApplicationStatusUpdateRequest(BaseModel):
    status: Literal["submitted", "shortlisted", "rejected", "selected"]
