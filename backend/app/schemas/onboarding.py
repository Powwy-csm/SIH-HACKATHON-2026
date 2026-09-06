from pydantic import BaseModel
from typing import List, Optional

class SkillSelection(BaseModel):
    skill_id: str
    proficiency: str  # beginner, intermediate, advanced

class OnboardingCompleteRequest(BaseModel):
    bio: Optional[str] = None
    domain_id: Optional[str] = None
    subdomain_id: Optional[str] = None
    interest_id: Optional[str] = None
    skills: List[SkillSelection] = []

class AssessmentAnswer(BaseModel):
    question_id: str
    selected_index: int

class AssessmentSubmitRequest(BaseModel):
    interest_id: Optional[str] = None
    answers: List[AssessmentAnswer]

class AssessmentSubmitResponse(BaseModel):
    score: float
