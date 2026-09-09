from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel

class CompanyProfileUpdate(BaseModel):
    name: Optional[str] = None
    industry_sector: Optional[str] = None
    company_size: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_email: Optional[str] = None

class CompanyProfileResponse(BaseModel):
    id: Optional[str] = None
    name: str
    admin_profile_id: Optional[str] = None
    industry_sector: Optional[str] = None
    company_size: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_email: Optional[str] = None
    verification_status: Optional[str] = "verified"
    open_opportunities_count: int = 0
    total_applications_count: int = 0

class PostingCreate(BaseModel):
    title: str
    department: Optional[str] = None
    type: str  # internship, placement, apprenticeship, training, bootcamp
    mode: Optional[str] = "on-site"
    location: Optional[str] = None
    duration_months: Optional[float] = None
    stipend_text: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    openings: Optional[int] = 1
    application_deadline: Optional[str] = None
    description: Optional[str] = None
    skills_list: Optional[List[str]] = []
    status: Optional[str] = "open"

class PostingUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    mode: Optional[str] = None
    location: Optional[str] = None
    duration_months: Optional[float] = None
    stipend_text: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    openings: Optional[int] = None
    application_deadline: Optional[str] = None
    description: Optional[str] = None
    skills_list: Optional[List[str]] = None
    status: Optional[str] = None

class PostingResponse(BaseModel):
    id: str
    title: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    type: str
    mode: Optional[str] = "on-site"
    location: Optional[str] = None
    duration_months: Optional[float] = None
    stipend_text: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    openings: Optional[int] = 1
    application_deadline: Optional[str] = None
    description: Optional[str] = None
    skills_list: List[str] = []
    status: str
    created_at: Optional[str] = None
    posted_by: Optional[str] = None
    applicant_count: int = 0
    has_applied: Optional[bool] = False

class ApplicationStatusUpdate(BaseModel):
    status: str  # applied, reviewing, shortlisted, interview_scheduled, selected, rejected

class ApplicantSkill(BaseModel):
    name: str
    proficiency: Optional[int] = None
    verified: bool = False

class ApplicantCertification(BaseModel):
    title: str
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    credential_url: Optional[str] = None

class ApplicationDetailResponse(BaseModel):
    id: str
    posting_id: str
    posting_title: str
    student_id: str
    student_name: str
    student_email: Optional[str] = None
    status: str
    cover_letter: Optional[str] = None
    applied_at: str
    skills: List[ApplicantSkill] = []
    certifications: List[ApplicantCertification] = []

class StudentApplicationItem(BaseModel):
    id: str
    posting_id: str
    posting_title: str
    company_name: str
    company_logo: Optional[str] = None
    type: str
    location: Optional[str] = None
    stipend_text: Optional[str] = None
    status: str
    applied_at: str
