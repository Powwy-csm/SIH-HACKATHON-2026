from fastapi import APIRouter, Depends
from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.schemas.onboarding import OnboardingCompleteRequest, AssessmentSubmitRequest, AssessmentSubmitResponse
from app.services import onboarding_service
from app.schemas.onboarding_data import get_questions_for_interest

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

@router.get("/config")
async def get_config(current: CurrentStudent = Depends(get_current_student)):
    return onboarding_service.get_config(current.client)

@router.get("/assessment")
async def get_assessment(interest_id: str | None = None, current: CurrentStudent = Depends(get_current_student)):
    questions = get_questions_for_interest(interest_id)
    # Remove correct_index from payload
    safe_questions = []
    for q in questions:
        q_copy = dict(q)
        q_copy.pop("correct_index", None)
        safe_questions.append(q_copy)
    return {"questions": safe_questions}

@router.post("/complete")
async def complete_onboarding(
    body: OnboardingCompleteRequest,
    current: CurrentStudent = Depends(get_current_student),
    service_client = Depends(get_service_client)
):
    result = onboarding_service.complete_onboarding(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        data=body.model_dump()
    )
    return result

@router.post("/assessment", response_model=AssessmentSubmitResponse)
async def submit_assessment(
    body: AssessmentSubmitRequest,
    current: CurrentStudent = Depends(get_current_student)
):
    result = onboarding_service.submit_assessment(
        client=current.client,
        student_id=current.student_id,
        data=body.model_dump()
    )
    return AssessmentSubmitResponse(**result)
