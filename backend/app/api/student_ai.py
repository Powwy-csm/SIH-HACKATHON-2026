from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.schemas.student_ai import (
    DashboardResponse,
    OpportunityMatchRequest,
    OpportunityMatchResponse,
    ProfileAnalysisResponse,
    SimulateImprovementRequest,
    SimulateImprovementResponse,
    SkillGapRequest,
    SkillGapResponse,
)
from app.services import dashboard_service, opportunity_service, profile_service, simulation_service
from app.services import skill_gap_service

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
