from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.schemas.student_ai import (
    ApplicationListResponse,
    ApplyRequest,
    ApplyResponse,
    DashboardResponse,
    OpportunityMatchRequest,
    OpportunityMatchResponse,
    ProfileAnalysisResponse,
    ProfileUpdateRequest,
    ProfileUpdateResponse,
    SimulateImprovementRequest,
    SimulateImprovementResponse,
    SkillDeleteResponse,
    SkillGapRequest,
    SkillGapResponse,
    SkillItem,
    SkillListResponse,
    SkillUpsertRequest,
)
from app.services import (
    application_service,
    dashboard_service,
    opportunity_service,
    profile_service,
    simulation_service,
    skill_gap_service,
)

router = APIRouter(prefix="/api/student-ai", tags=["student-ai"])


# A. Student AI Profile Analysis
@router.post("/profile/analyze", response_model=ProfileAnalysisResponse)
async def profile_analyze(current: CurrentStudent = Depends(get_current_student)):
    data = profile_service.analyze_profile(current.client, current.student_id)
    return ProfileAnalysisResponse(**data)


# B. Student Dashboard Intelligence (cache-only, no auto-recompute)
@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(current: CurrentStudent = Depends(get_current_student)):
    data = dashboard_service.get_dashboard(current.client, current.student_id)
    return DashboardResponse(**data)


# C. AI Opportunity Matching
@router.post("/opportunities/match", response_model=OpportunityMatchResponse)
async def opportunities_match(
    body: OpportunityMatchRequest,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    results = opportunity_service.match_opportunities(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        domain_id=body.domain_id,
        posting_type=body.type,
        refresh=body.refresh,
    )
    return OpportunityMatchResponse(recommendations=results)


# D. Skill Gap Analysis (posting_id required — no fuzzy role matching)
@router.post("/skill-gaps/analyze", response_model=SkillGapResponse)
async def skill_gaps_analyze(
    body: SkillGapRequest,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    data = skill_gap_service.analyze_skill_gaps(
        client=current.client,
        service_client=service_client,
        student_id=current.student_id,
        posting_id=body.posting_id,
    )
    return SkillGapResponse(**data)


# E. Improvement Simulation (ephemeral, never persisted)
@router.post("/simulate-improvement", response_model=SimulateImprovementResponse)
async def simulate_improvement(
    body: SimulateImprovementRequest,
    current: CurrentStudent = Depends(get_current_student),
):
    data = simulation_service.simulate_improvement(
        client=current.client,
        student_id=current.student_id,
        posting_id=body.posting_id,
        skill_improvements=[s.model_dump() for s in body.skill_improvements],
    )
    return SimulateImprovementResponse(**data)


# F. Applications (student side)
@router.post("/applications", response_model=ApplyResponse, status_code=201)
async def apply_to_posting(
    body: ApplyRequest,
    current: CurrentStudent = Depends(get_current_student),
):
    data = application_service.apply_to_posting(
        current.client,
        current.student_id,
        body.posting_id,
    )
    return ApplyResponse(**data)


@router.get("/applications", response_model=ApplicationListResponse)
async def my_applications(
    current: CurrentStudent = Depends(get_current_student),
):
    items = application_service.list_my_applications(
        current.client,
        current.student_id,
    )
    return ApplicationListResponse(applications=items)


# G. Profile edit + skills CRUD
@router.patch("/profile", response_model=ProfileUpdateResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    current: CurrentStudent = Depends(get_current_student),
):
    data = profile_service.update_profile(
        current.client,
        current.student_id,
        body.model_dump(),
    )
    return ProfileUpdateResponse(**data)


@router.get("/skills", response_model=SkillListResponse)
async def list_skills(
    current: CurrentStudent = Depends(get_current_student),
):
    rows = profile_service.list_skills(
        current.client,
        current.student_id,
    )
    return SkillListResponse(
        skills=[SkillItem(**r) for r in rows]
    )


@router.put("/skills", response_model=SkillItem, status_code=201)
async def upsert_skill(
    body: SkillUpsertRequest,
    current: CurrentStudent = Depends(get_current_student),
):
    row = profile_service.upsert_skill(
        current.client,
        current.student_id,
        body.skill_id,
        body.proficiency,
        body.proficiency_score,
    )

    enriched = next(
        (
            r
            for r in profile_service.list_skills(
                current.client,
                current.student_id,
            )
            if r["skill_id"] == body.skill_id
        ),
        None,
    )

    return SkillItem(**(enriched or row))


@router.delete(
    "/skills/{skill_id}",
    response_model=SkillDeleteResponse,
)
async def delete_skill(
    skill_id: str,
    current: CurrentStudent = Depends(get_current_student),
):
    profile_service.delete_skill(
        current.client,
        current.student_id,
        skill_id,
    )
    return SkillDeleteResponse(
        skill_id=skill_id,
        deleted=True,
    )