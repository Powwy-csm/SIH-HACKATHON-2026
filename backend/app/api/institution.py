from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps.auth import CurrentUser, get_current_institution
from app.deps.supabase_clients import get_service_client
from app.schemas.institution import InstitutionDashboardResponse, InstitutionProfileResponse
from app.services import institution_service

router = APIRouter(prefix="/api/institution", tags=["institution"])


@router.get("/profile", response_model=InstitutionProfileResponse)
async def profile(current: CurrentUser = Depends(get_current_institution)):
    data = institution_service.get_institution_profile(current.client, current.id)
    return InstitutionProfileResponse(**data)


@router.get("/dashboard", response_model=InstitutionDashboardResponse)
async def dashboard(
    current: CurrentUser = Depends(get_current_institution),
    service_client=Depends(get_service_client),
):
    data = institution_service.get_dashboard(current.client, service_client, current.id)
    return InstitutionDashboardResponse(**data)
