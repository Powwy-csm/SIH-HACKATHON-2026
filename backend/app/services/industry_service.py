from __future__ import annotations

from fastapi import HTTPException, status
from supabase import Client

from app.services import repository as repo


def get_company_profile(client: Client, admin_profile_id: str) -> dict:
    company = repo.fetch_company_for_admin(client, admin_profile_id)
    if not company:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Company profile not found for this account.")
    return company


def create_posting(
    client: Client,
    admin_profile_id: str,
    title: str,
    domain_id: str | None,
    posting_type: str,
    required_skills: list[dict],
) -> dict:
    company = get_company_profile(client, admin_profile_id)
    posting = repo.create_posting(client, company["id"], title, domain_id, posting_type)
    if not posting:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not create the posting.")
    if required_skills:
        repo.set_posting_required_skills(client, posting["id"], required_skills)
    return posting


def list_my_postings(client: Client, admin_profile_id: str) -> list[dict]:
    company = get_company_profile(client, admin_profile_id)
    return repo.fetch_company_postings(client, company["id"])


def update_posting_status(client: Client, admin_profile_id: str, posting_id: str, status_value: str) -> dict:
    """Ownership is double-checked here (not just left to RLS) because the
    fake test client has no RLS engine to enforce it -- this keeps the
    business rule testable and correct even before a real Postgres project
    is wired in."""
    company = get_company_profile(client, admin_profile_id)
    owned = repo.fetch_company_postings(client, company["id"])
    if not any(p["id"] == posting_id for p in owned):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Posting not found or not owned by your company.")
    updated = repo.update_posting_status(client, posting_id, status_value)
    if not updated:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not update the posting.")
    return updated


def list_applicants(client: Client, admin_profile_id: str, posting_id: str | None = None) -> list[dict]:
    company = get_company_profile(client, admin_profile_id)
    owned_postings = {p["id"] for p in repo.fetch_company_postings(client, company["id"])}

    if posting_id:
        if posting_id not in owned_postings:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Posting not found or not owned by your company.")

    rows = repo.fetch_company_applications(client, posting_id)
    out = []
    for r in rows:
        if r["posting_id"] not in owned_postings:
            continue  # extra safety net on top of RLS; matters for the mock test client, which has no RLS engine
        posting = r.get("postings") or {}
        out.append({
            "id": r["id"],
            "student_id": r["student_id"],
            "posting_id": r["posting_id"],
            "posting_title": posting.get("title", "Unknown"),
            "status": r["status"],
            "applied_at": r["applied_at"],
        })
    return out


def update_applicant_status(client: Client, admin_profile_id: str, application_id: str, status_value: str) -> dict:
    company = get_company_profile(client, admin_profile_id)
    owned_postings = {p["id"] for p in repo.fetch_company_postings(client, company["id"])}
    owned_applications = repo.fetch_company_applications(client)
    match = next((a for a in owned_applications if a["id"] == application_id and a["posting_id"] in owned_postings), None)
    if not match:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found or not owned by your company.")

    updated = repo.update_application_status(client, application_id, status_value)
    if not updated:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not update the application.")
    return updated
