from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps.auth import CurrentUser, get_current_industry
from app.schemas.industry import (
    ApplicantListResponse,
    ApplicationStatusUpdateRequest,
    CompanyProfileResponse,
    PostingCreateRequest,
    PostingItem,
    PostingListResponse,
    PostingStatusUpdateRequest,
)
from app.services import industry_service

router = APIRouter(prefix="/api/industry", tags=["industry"])


@router.get("/company", response_model=CompanyProfileResponse)
async def company_profile(current: CurrentUser = Depends(get_current_industry)):
    data = industry_service.get_company_profile(current.client, current.id)
    return CompanyProfileResponse(**data)


@router.post("/postings", response_model=PostingItem, status_code=201)
async def create_posting(
    body: PostingCreateRequest,
    current: CurrentUser = Depends(get_current_industry),
):
    data = industry_service.create_posting(
        client=current.client,
        admin_profile_id=current.id,
        title=body.title,
        domain_id=body.domain_id,
        posting_type=body.type,
        required_skills=[s.model_dump() for s in body.required_skills],
    )
    return PostingItem(**data)


@router.get("/postings", response_model=PostingListResponse)
async def list_postings(current: CurrentUser = Depends(get_current_industry)):
    data = industry_service.list_my_postings(current.client, current.id)
    return PostingListResponse(postings=[PostingItem(**p) for p in data])


@router.patch("/postings/{posting_id}/status", response_model=PostingItem)
async def update_posting_status(
    posting_id: str,
    body: PostingStatusUpdateRequest,
    current: CurrentUser = Depends(get_current_industry),
):
    data = industry_service.update_posting_status(current.client, current.id, posting_id, body.status)
    return PostingItem(**data)


@router.get("/applications", response_model=ApplicantListResponse)
async def list_applicants(
    posting_id: str | None = None,
    current: CurrentUser = Depends(get_current_industry),
):
    data = industry_service.list_applicants(current.client, current.id, posting_id)
    return ApplicantListResponse(applicants=data)


@router.patch("/applications/{application_id}/status")
async def update_applicant_status(
    application_id: str,
    body: ApplicationStatusUpdateRequest,
    current: CurrentUser = Depends(get_current_industry),
):
    updated = industry_service.update_applicant_status(current.client, current.id, application_id, body.status)
    return {"id": updated["id"], "status": updated["status"]}
