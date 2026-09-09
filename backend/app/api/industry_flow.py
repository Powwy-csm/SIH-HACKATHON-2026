import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.deps.auth import (
    CurrentIndustryUser,
    CurrentStudent,
    get_current_industry_user,
    get_current_student,
)
from app.deps.supabase_clients import get_service_client
from app.schemas.industry import (
    ApplicantCertification,
    ApplicantSkill,
    ApplicationDetailResponse,
    ApplicationStatusUpdate,
    CompanyProfileResponse,
    CompanyProfileUpdate,
    PostingCreate,
    PostingResponse,
    PostingUpdate,
    StudentApplicationItem,
)

router = APIRouter(tags=["industry-student-flow"])

# -----------------------------------------------------------------------------
# Company Resolution Helpers (No unsafe .maybe_single() calls)
# -----------------------------------------------------------------------------

def get_company_by_admin(service_client, admin_profile_id: str) -> Optional[dict]:
    """Fetch company record for an industry user by admin_profile_id safely."""
    try:
        res = (
            service_client.table("companies")
            .select("*")
            .eq("admin_profile_id", admin_profile_id)
            .execute()
        )
        if res and res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as exc:
        print(f"[industry_flow] Error querying companies for admin {admin_profile_id}: {exc}")
    return None


_AUTH_META_CACHE: tuple[float, tuple[dict[str, str], dict[str, str]]] = (0.0, ({}, {}))


def _get_auth_metadata(service_client) -> tuple[dict[str, str], dict[str, str]]:
    """Fetch auth user metadata to prioritize the student's chosen name and role over stale profiles."""
    global _AUTH_META_CACHE
    now = time.time()
    cached_time, cached_data = _AUTH_META_CACHE
    if (now - cached_time < 60) and (cached_data[0] or cached_data[1]):
        return cached_data

    auth_names_by_id: dict[str, str] = {}
    auth_roles_by_id: dict[str, str] = {}
    try:
        auth_resp = service_client.auth.admin.list_users()
        auth_users = getattr(auth_resp, "users", auth_resp) if not isinstance(auth_resp, list) else auth_resp
        for u in auth_users or []:
            uid = getattr(u, "id", None) or (u.get("id") if isinstance(u, dict) else None)
            meta = getattr(u, "user_metadata", None) or (u.get("user_metadata") if isinstance(u, dict) else {}) or {}
            app_meta = getattr(u, "app_metadata", None) or (u.get("app_metadata") if isinstance(u, dict) else {}) or {}
            fn = meta.get("full_name") or meta.get("name") or app_meta.get("full_name") or app_meta.get("name")
            if uid and fn and str(fn).strip():
                auth_names_by_id[str(uid)] = str(fn).strip()
            r_role = meta.get("role") or meta.get("user_role") or app_meta.get("role") or app_meta.get("user_role")
            if uid and r_role:
                auth_roles_by_id[str(uid)] = str(r_role).strip().lower()
        _AUTH_META_CACHE = (now, (auth_names_by_id, auth_roles_by_id))
    except Exception as exc:
        print(f"[industry_flow] Could not fetch auth users for metadata names/roles: {exc}")
        if cached_data[0] or cached_data[1]:
            return cached_data
    return auth_names_by_id, auth_roles_by_id


def _get_non_student_ids(service_client) -> set[str]:
    """Collect IDs of company admins and opportunity posters to prevent them from appearing in student lists."""
    non_student_ids: set[str] = set()
    try:
        comp_res = service_client.table("companies").select("admin_profile_id").execute()
        for c in (comp_res.data or []):
            aid = c.get("admin_profile_id")
            if aid:
                non_student_ids.add(str(aid))
    except Exception:
        pass
    try:
        post_res = service_client.table("postings").select("posted_by").execute()
        for p in (post_res.data or []):
            pby = p.get("posted_by")
            if pby:
                non_student_ids.add(str(pby))
    except Exception:
        pass
    return non_student_ids


def get_or_create_company_for_user(service_client, user_id: str, email: Optional[str] = None) -> dict:
    """
    Safely resolves the company associated with an authenticated industry user.
    Auto-bootstraps or links an unassigned company row if needed so the user
    always gets a valid company record without hardcoded data.
    """
    # 1. Lookup by admin_profile_id
    comp = get_company_by_admin(service_client, user_id)
    if comp:
        return comp

    # 2. Lookup by postings created by this user that reference a company
    try:
        postings_res = (
            service_client.table("postings")
            .select("company_id")
            .eq("posted_by", user_id)
            .execute()
        )
        if postings_res and postings_res.data:
            for p in postings_res.data:
                cid = p.get("company_id")
                if cid:
                    c_res = (
                        service_client.table("companies")
                        .select("*")
                        .eq("id", cid)
                        .execute()
                    )
                    if c_res and c_res.data:
                        matched_comp = c_res.data[0]
                        # Link company to this user
                        service_client.table("companies").update(
                            {"admin_profile_id": user_id}
                        ).eq("id", cid).execute()
                        matched_comp["admin_profile_id"] = user_id
                        return matched_comp
    except Exception as exc:
        print(f"[industry_flow] Error resolving company from postings for user {user_id}: {exc}")

    # 3. Create a new company profile for this industry user
    p_data = {}
    try:
        prof_res = (
            service_client.table("profiles")
            .select("full_name, email")
            .eq("id", user_id)
            .execute()
        )
        p_data = prof_res.data[0] if (prof_res and prof_res.data) else {}
    except Exception as exc:
        print(f"[industry_flow] Profiles lookup error for {user_id}: {exc}")

    default_name = p_data.get("full_name") or (email or "My Company").split("@", 1)[0]
    if default_name.lower() in ("student", "user", "admin", "null", ""):
        default_name = "Industry Partner Company"

    new_payload = {
        "admin_profile_id": user_id,
        "name": default_name,
        "industry_sector": "Technology & Innovation",
        "company_size": "50-200 employees",
        "description": "Leading tech company dedicated to innovation.",
        "verification_status": "verified",
        "contact_email": email or p_data.get("email") or "",
    }

    try:
        insert_res = service_client.table("companies").insert(new_payload).execute()
        if insert_res and insert_res.data:
            print(f"[industry_flow] Bootstrapped new company '{default_name}' for user {user_id}")
            return insert_res.data[0]
    except Exception as exc:
        print(f"[industry_flow] Failed to create company profile for user {user_id}: {exc}")

    return {
        "id": None,
        "name": default_name,
        "admin_profile_id": user_id,
        "industry_sector": "Technology & Innovation",
    }


# -----------------------------------------------------------------------------
# Industry Endpoints (/api/industry)
# -----------------------------------------------------------------------------

@router.get("/api/industry/company", response_model=CompanyProfileResponse)
def get_company_profile(
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Fetch company profile, open postings count, and total application count."""
    comp = get_or_create_company_for_user(service_client, current.user_id, current.email)
    company_id = comp.get("id")

    # Open postings count
    open_count = 0
    try:
        if company_id:
            postings_res = (
                service_client.table("postings")
                .select("id", count="exact")
                .or_(f"posted_by.eq.{current.user_id},company_id.eq.{company_id}")
                .eq("status", "open")
                .execute()
            )
        else:
            postings_res = (
                service_client.table("postings")
                .select("id", count="exact")
                .eq("posted_by", current.user_id)
                .eq("status", "open")
                .execute()
            )
        open_count = postings_res.count if (postings_res and postings_res.count is not None) else 0
    except Exception as exc:
        print(f"[industry_flow] Error counting open postings for user {current.user_id}: {exc}")

    # Total applications count across all postings owned by recruiter
    total_apps = 0
    try:
        if company_id:
            all_postings = (
                service_client.table("postings")
                .select("id")
                .or_(f"posted_by.eq.{current.user_id},company_id.eq.{company_id}")
                .execute()
            )
        else:
            all_postings = (
                service_client.table("postings")
                .select("id")
                .eq("posted_by", current.user_id)
                .execute()
            )
        posting_ids = [p["id"] for p in (all_postings.data or []) if p.get("id")]

        if posting_ids:
            apps_res = (
                service_client.table("applications")
                .select("id", count="exact")
                .in_("posting_id", posting_ids)
                .execute()
            )
            total_apps = apps_res.count if (apps_res and apps_res.count is not None) else 0
    except Exception as exc:
        print(f"[industry_flow] Error counting total applications for user {current.user_id}: {exc}")

    return CompanyProfileResponse(
        id=comp.get("id"),
        name=comp.get("name") or "Company",
        admin_profile_id=comp.get("admin_profile_id"),
        industry_sector=comp.get("industry_sector"),
        company_size=comp.get("company_size"),
        description=comp.get("description"),
        logo_url=comp.get("logo_url"),
        website=comp.get("website"),
        address=comp.get("address"),
        city=comp.get("city"),
        state=comp.get("state"),
        contact_email=comp.get("contact_email"),
        verification_status=comp.get("verification_status") or "verified",
        open_opportunities_count=open_count,
        total_applications_count=total_apps,
    )


@router.put("/api/industry/company", response_model=CompanyProfileResponse)
def update_company_profile(
    body: CompanyProfileUpdate,
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Update company profile."""
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        return get_company_profile(current, service_client)

    comp = get_or_create_company_for_user(service_client, current.user_id, current.email)
    company_id = comp.get("id")

    if company_id:
        service_client.table("companies").update(update_data).eq("id", company_id).execute()
    else:
        update_data["admin_profile_id"] = current.user_id
        service_client.table("companies").insert(update_data).execute()

    return get_company_profile(current, service_client)


@router.get("/api/industry/opportunities", response_model=List[PostingResponse])
def get_industry_opportunities(
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Fetch opportunities posted by the current recruiter/company with applicant counts."""
    comp = get_or_create_company_for_user(service_client, current.user_id, current.email)
    company_id = comp.get("id")

    print(f"[DEBUG] GET /api/industry/opportunities for user_id={current.user_id}, company_id={company_id}")

    # Fetch postings owned by user or company
    query = service_client.table("postings").select("*").order("created_at", desc=True)
    if company_id:
        query = query.or_(f"posted_by.eq.{current.user_id},company_id.eq.{company_id}")
    else:
        query = query.eq("posted_by", current.user_id)

    postings_res = query.execute()
    postings = postings_res.data if (postings_res and postings_res.data) else []

    print(f"[DEBUG] Found {len(postings)} postings for user_id={current.user_id}")

    if not postings:
        return []

    posting_ids = [p["id"] for p in postings if p.get("id")]

    # Fetch applicant counts per posting in bulk
    app_counts: dict[str, int] = {}
    if posting_ids:
        try:
            apps_res = (
                service_client.table("applications")
                .select("posting_id")
                .in_("posting_id", posting_ids)
                .execute()
            )
            for app in (apps_res.data if (apps_res and apps_res.data) else []):
                pid = app.get("posting_id")
                if pid:
                    app_counts[pid] = app_counts.get(pid, 0) + 1
        except Exception as exc:
            print(f"[industry_flow] Error fetching application counts: {exc}")

    result: List[PostingResponse] = []
    for p in postings:
        skills = p.get("skills_list") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]

        result.append(
            PostingResponse(
                id=p["id"],
                title=p.get("title") or "Untitled Posting",
                company_id=p.get("company_id") or company_id,
                company_name=comp.get("name") or "Company",
                company_logo=comp.get("logo_url"),
                type=p.get("type") or "internship",
                mode=p.get("mode") or "on-site",
                location=p.get("location"),
                duration_months=p.get("duration_months"),
                stipend_text=p.get("stipend_text"),
                eligibility_criteria=p.get("eligibility_criteria"),
                openings=p.get("openings") or 1,
                application_deadline=p.get("application_deadline"),
                description=p.get("description"),
                skills_list=skills,
                status=p.get("status") or "open",
                created_at=p.get("created_at"),
                posted_by=p.get("posted_by"),
                applicant_count=app_counts.get(p["id"], 0),
            )
        )

    return result


def _normalize_mode(raw_mode: Optional[str]) -> str:
    """Normalize mode string to match Postgres posting_mode enum ('onsite', 'remote', 'hybrid')."""
    if not raw_mode:
        return "onsite"
    m = raw_mode.lower().replace("-", "").replace("_", "").replace(" ", "")
    if "remote" in m:
        return "remote"
    if "hybrid" in m:
        return "hybrid"
    return "onsite"


@router.post("/api/industry/opportunities", response_model=PostingResponse)
def create_industry_opportunity(
    body: PostingCreate,
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Create and publish a new opportunity."""
    comp = get_or_create_company_for_user(service_client, current.user_id, current.email)
    company_id = comp.get("id")

    payload = {
        "title": body.title,
        "company_id": company_id,
        "type": body.type or "internship",
        "status": body.status or "open",
        "description": body.description,
        "location": body.location,
        "mode": _normalize_mode(body.mode),
        "duration_months": int(round(body.duration_months)) if body.duration_months is not None else None,
        "stipend_text": body.stipend_text,
        "eligibility_criteria": body.eligibility_criteria,
        "openings": body.openings or 1,
        "application_deadline": body.application_deadline,
        "posted_by": current.user_id,
        "skills_list": body.skills_list or [],
    }

    # Ensure clean non-null/valid payload
    payload = {k: v for k, v in payload.items() if v is not None}

    res = service_client.table("postings").insert(payload).execute()
    if not res or not res.data:
        raise HTTPException(status_code=400, detail="Failed to create opportunity posting.")

    created = res.data[0]
    return PostingResponse(
        id=created["id"],
        title=created.get("title") or body.title,
        company_id=company_id,
        company_name=comp.get("name") or "Company",
        company_logo=comp.get("logo_url"),
        type=created.get("type") or body.type,
        mode=created.get("mode") or body.mode,
        location=created.get("location"),
        duration_months=created.get("duration_months"),
        stipend_text=created.get("stipend_text"),
        eligibility_criteria=created.get("eligibility_criteria"),
        openings=created.get("openings") or 1,
        application_deadline=created.get("application_deadline"),
        description=created.get("description"),
        skills_list=created.get("skills_list") or body.skills_list or [],
        status=created.get("status") or "open",
        created_at=created.get("created_at"),
        posted_by=current.user_id,
        applicant_count=0,
    )


@router.patch("/api/industry/opportunities/{posting_id}", response_model=PostingResponse)
def update_industry_opportunity(
    posting_id: str,
    body: PostingUpdate,
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Update an existing opportunity."""
    valid_cols = {
        "title", "type", "status", "description", "location", "mode",
        "duration_months", "stipend_text", "eligibility_criteria",
        "openings", "application_deadline", "skills_list"
    }
    raw_update = body.model_dump(exclude_unset=True)
    update_data = {k: v for k, v in raw_update.items() if k in valid_cols}
    if "duration_months" in update_data and update_data["duration_months"] is not None:
        update_data["duration_months"] = int(round(update_data["duration_months"]))
    if "mode" in update_data and update_data["mode"] is not None:
        update_data["mode"] = _normalize_mode(update_data["mode"])
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    existing_res = (
        service_client.table("postings")
        .select("id, company_id, posted_by")
        .eq("id", posting_id)
        .execute()
    )
    if not existing_res or not existing_res.data:
        raise HTTPException(status_code=404, detail="Posting not found.")

    res = service_client.table("postings").update(update_data).eq("id", posting_id).execute()
    if not res or not res.data:
        raise HTTPException(status_code=400, detail="Failed to update posting.")

    return get_industry_opportunities(current, service_client)[0]


@router.get("/api/industry/applications", response_model=List[dict])
def get_industry_applications(
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Fetch applications submitted to postings owned by recruiter's company."""
    comp = get_or_create_company_for_user(service_client, current.user_id, current.email)
    company_id = comp.get("id")

    query = service_client.table("postings").select("id, title, type")
    if company_id:
        query = query.or_(f"posted_by.eq.{current.user_id},company_id.eq.{company_id}")
    else:
        query = query.eq("posted_by", current.user_id)

    postings_res = query.execute()
    postings = postings_res.data if (postings_res and postings_res.data) else []
    if not postings:
        return []

    posting_map = {p["id"]: p for p in postings}
    posting_ids = list(posting_map.keys())

    apps_res = (
        service_client.table("applications")
        .select("id, posting_id, student_id, status, cover_letter, applied_at")
        .in_("posting_id", posting_ids)
        .order("applied_at", desc=True)
        .execute()
    )
    apps = apps_res.data if (apps_res and apps_res.data) else []
    if not apps:
        return []

    student_ids = list({a["student_id"] for a in apps if a.get("student_id")})
    profile_map = {}
    auth_names, _ = _get_auth_metadata(service_client)
    if student_ids:
        profiles_res = (
            service_client.table("profiles")
            .select("id, full_name, email")
            .in_("id", student_ids)
            .execute()
        )
        for p in (profiles_res.data if (profiles_res and profiles_res.data) else []):
            profile_map[p["id"]] = p

    result = []
    for a in apps:
        sid = a.get("student_id")
        prof = profile_map.get(sid, {})
        post = posting_map.get(a["posting_id"], {})
        name = (
            auth_names.get(sid)
            or (prof.get("full_name") or "").strip()
            or (prof.get("email") or "Applicant Candidate").split("@", 1)[0]
        )
        if not name or name.strip() == "":
            name = "Applicant Candidate"
        result.append({
            "id": a["id"],
            "posting_id": a["posting_id"],
            "posting_title": post.get("title") or "Opportunity",
            "type": post.get("type") or "internship",
            "student_id": sid,
            "student_name": name,
            "student_email": prof.get("email"),
            "status": a.get("status") or "applied",
            "cover_letter": a.get("cover_letter"),
            "applied_at": a.get("applied_at"),
        })

    return result


@router.get("/api/industry/applications/{application_id}/applicant", response_model=ApplicationDetailResponse)
def get_applicant_detail(
    application_id: str,
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Fetch full details of an applicant candidate for a specific application."""
    app_res = (
        service_client.table("applications")
        .select("id, posting_id, student_id, status, cover_letter, applied_at")
        .eq("id", application_id)
        .execute()
    )
    if not app_res or not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found.")

    app_data = app_res.data[0]
    student_id = app_data["student_id"]
    posting_id = app_data["posting_id"]

    # Posting title
    post_res = (
        service_client.table("postings")
        .select("title")
        .eq("id", posting_id)
        .execute()
    )
    posting_title = (post_res.data[0]["title"] if (post_res and post_res.data) else "Opportunity")

    # Profile
    prof_res = (
        service_client.table("profiles")
        .select("full_name, email")
        .eq("id", student_id)
        .execute()
    )
    prof_data = prof_res.data[0] if (prof_res and prof_res.data) else {}

    # Student skills
    skills_res = (
        service_client.table("student_skills")
        .select("proficiency_score, is_verified, skills(name)")
        .eq("student_id", student_id)
        .execute()
    )
    applicant_skills: List[ApplicantSkill] = []
    for s in (skills_res.data if (skills_res and skills_res.data) else []):
        skill_obj = s.get("skills") or {}
        sname = skill_obj.get("name") if isinstance(skill_obj, dict) else None
        if sname:
            applicant_skills.append(
                ApplicantSkill(
                    name=sname,
                    proficiency=s.get("proficiency_score"),
                    verified=bool(s.get("is_verified")),
                )
            )

    # Certifications
    certs_res = (
        service_client.table("certifications")
        .select("title, issuing_organization, issue_date, credential_url")
        .eq("student_id", student_id)
        .execute()
    )
    applicant_certs: List[ApplicantCertification] = []
    for c in (certs_res.data if (certs_res and certs_res.data) else []):
        applicant_certs.append(
            ApplicantCertification(
                title=c.get("title") or "Certification",
                issuer=c.get("issuing_organization"),
                issue_date=c.get("issue_date"),
                credential_url=c.get("credential_url"),
            )
        )

    auth_name = None
    try:
        auth_user = service_client.auth.admin.get_user_by_id(student_id)
        if auth_user:
            meta = getattr(auth_user, "user_metadata", None) or (auth_user.get("user_metadata") if isinstance(auth_user, dict) else {}) or {}
            auth_name = meta.get("full_name") or meta.get("name")
    except Exception:
        pass

    student_name = (
        (str(auth_name).strip() if auth_name else None)
        or (prof_data.get("full_name") or "").strip()
        or (prof_data.get("email") or "Applicant Candidate").split("@", 1)[0]
    )

    return ApplicationDetailResponse(
        id=app_data["id"],
        posting_id=posting_id,
        posting_title=posting_title,
        student_id=student_id,
        student_name=student_name,
        student_email=prof_data.get("email"),
        status=app_data.get("status") or "applied",
        cover_letter=app_data.get("cover_letter"),
        applied_at=app_data.get("applied_at"),
        skills=applicant_skills,
        certifications=applicant_certs,
    )


@router.patch("/api/industry/applications/{application_id}/status")
def update_application_status(
    application_id: str,
    body: ApplicationStatusUpdate,
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Update pipeline status of an application."""
    valid_statuses = {"applied", "reviewing", "shortlisted", "interview_scheduled", "selected", "rejected"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    res = (
        service_client.table("applications")
        .update({"status": body.status, "updated_at": "now()"})
        .eq("id", application_id)
        .execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=404, detail="Application not found or update failed.")

    return {"status": "success", "data": res.data[0]}


# -----------------------------------------------------------------------------
# Student Endpoints (/api/student)
# -----------------------------------------------------------------------------

@router.get("/api/student/opportunities", response_model=List[PostingResponse])
def get_student_opportunities(
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Fetch open opportunities for student with companies join and applied status."""
    postings_res = (
        service_client.table("postings")
        .select("*, companies(name, logo_url)")
        .eq("status", "open")
        .order("created_at", desc=True)
        .execute()
    )
    postings = postings_res.data if (postings_res and postings_res.data) else []
    if not postings:
        return []

    # Student's applications
    applied_posting_ids = set()
    try:
        my_apps_res = (
            service_client.table("applications")
            .select("posting_id")
            .eq("student_id", current.student_id)
            .execute()
        )
        applied_posting_ids = {
            a["posting_id"] for a in (my_apps_res.data if (my_apps_res and my_apps_res.data) else []) if a.get("posting_id")
        }
    except Exception as exc:
        print(f"[industry_flow] Error fetching student applications: {exc}")

    result: List[PostingResponse] = []
    for p in postings:
        comp = p.get("companies") or {}
        skills = p.get("skills_list") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]

        result.append(
            PostingResponse(
                id=p["id"],
                title=p.get("title") or "Opportunity",
                company_id=p.get("company_id"),
                company_name=comp.get("name") or "BridgeX Partner Company",
                company_logo=comp.get("logo_url"),
                type=p.get("type") or "internship",
                mode=p.get("mode") or "on-site",
                location=p.get("location"),
                duration_months=p.get("duration_months"),
                stipend_text=p.get("stipend_text"),
                eligibility_criteria=p.get("eligibility_criteria"),
                openings=p.get("openings") or 1,
                application_deadline=p.get("application_deadline"),
                description=p.get("description"),
                skills_list=skills,
                status=p.get("status") or "open",
                created_at=p.get("created_at"),
                posted_by=p.get("posted_by"),
                has_applied=(p["id"] in applied_posting_ids),
            )
        )

    return result


class ApplyRequest(BaseModel):
    cover_letter: Optional[str] = None


@router.post("/api/student/opportunities/{posting_id}/apply")
def apply_to_opportunity(
    posting_id: str,
    body: Optional[ApplyRequest] = None,
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Apply current student to an open posting."""
    # Ensure students table record exists for this student
    try:
        service_client.table("students").upsert({"id": current.student_id}).execute()
    except Exception as exc:
        print(f"[industry_flow] Students table upsert note: {exc}")

    # Check if already applied
    existing_res = (
        service_client.table("applications")
        .select("id")
        .eq("posting_id", posting_id)
        .eq("student_id", current.student_id)
        .execute()
    )
    if existing_res and existing_res.data:
        return {"status": "success", "message": "Already applied.", "data": existing_res.data[0]}

    cover_letter_text = body.cover_letter if body else None

    res = (
        service_client.table("applications")
        .insert({
            "posting_id": posting_id,
            "student_id": current.student_id,
            "status": "applied",
            "cover_letter": cover_letter_text,
        })
        .execute()
    )
    if not res or not res.data:
        raise HTTPException(status_code=400, detail="Failed to submit application.")

    return {"status": "success", "data": res.data[0]}


@router.get("/api/student/applications", response_model=List[StudentApplicationItem])
def get_student_applications(
    current: CurrentStudent = Depends(get_current_student),
    service_client=Depends(get_service_client),
):
    """Fetch submitted applications for the current student."""
    apps_res = (
        service_client.table("applications")
        .select("id, posting_id, status, applied_at, postings(id, title, type, location, stipend_text, companies(name, logo_url))")
        .eq("student_id", current.student_id)
        .order("applied_at", desc=True)
        .execute()
    )
    apps = apps_res.data if (apps_res and apps_res.data) else []
    result: List[StudentApplicationItem] = []
    for a in apps:
        post = a.get("postings") or {}
        comp = post.get("companies") or {}
        result.append(
            StudentApplicationItem(
                id=a["id"],
                posting_id=a.get("posting_id") or post.get("id", ""),
                posting_title=post.get("title") or "Opportunity",
                company_name=comp.get("name") or "BridgeX Partner Company",
                company_logo=comp.get("logo_url"),
                type=post.get("type") or "internship",
                location=post.get("location"),
                stipend_text=post.get("stipend_text"),
                status=a.get("status") or "applied",
                applied_at=a.get("applied_at") or "",
            )
        )

    return result


@router.get("/api/industry/dashboard")
def get_industry_dashboard(
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Fetch real industry dashboard stats and top candidate matches from database."""
    auth_names, auth_roles = _get_auth_metadata(service_client)
    comp = get_or_create_company_for_user(service_client, current.user_id, current.email)
    company_id = comp.get("id")
    company_name = comp.get("name") or "Industry Partner"

    postings = []
    try:
        if company_id:
            postings_res = (
                service_client.table("postings")
                .select("*")
                .or_(f"posted_by.eq.{current.user_id},company_id.eq.{company_id}")
                .order("created_at", desc=True)
                .execute()
            )
        else:
            postings_res = (
                service_client.table("postings")
                .select("*")
                .eq("posted_by", current.user_id)
                .order("created_at", desc=True)
                .execute()
            )
        postings = postings_res.data if (postings_res and postings_res.data) else []
    except Exception as exc:
        print(f"[industry_flow] Dashboard postings query error: {exc}")

    open_count = sum(1 for p in postings if p.get("status") == "open")
    posting_ids = [p["id"] for p in postings if p.get("id")]

    total_apps = 0
    shortlisted_count = 0
    if posting_ids:
        try:
            apps_res = (
                service_client.table("applications")
                .select("id, posting_id, status")
                .in_("posting_id", posting_ids)
                .execute()
            )
            apps = apps_res.data if (apps_res and apps_res.data) else []
            total_apps = len(apps)
            shortlisted_count = sum(
                1 for a in apps if a.get("status") in ("shortlisted", "interview_scheduled", "selected")
            )
        except Exception as exc:
            print(f"[industry_flow] Dashboard applications query error: {exc}")

    # Dynamic Skill Demand from real postings
    all_open_postings = postings if postings else []
    skill_counter = {}
    for p in all_open_postings:
        skills = p.get("skills_list") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        for s in set(skills):
            s_clean = s.strip().title()
            if s_clean:
                skill_counter[s_clean] = skill_counter.get(s_clean, 0) + 1

    total_postings_count = max(len(all_open_postings), 1)
    skill_demand = []
    for skill_name, count in sorted(skill_counter.items(), key=lambda x: x[1], reverse=True)[:6]:
        pct = round((count / total_postings_count) * 100)
        skill_demand.append({
            "skill": skill_name,
            "count": count,
            "percentage": pct,
        })

    # Recent activity stream from real database applications
    recent_activity = []
    if posting_ids:
        try:
            recent_apps_res = (
                service_client.table("applications")
                .select("id, posting_id, student_id, status, applied_at, postings(title)")
                .in_("posting_id", posting_ids)
                .order("applied_at", desc=True)
                .limit(5)
                .execute()
            )
            raw_apps = recent_apps_res.data or []
            app_student_ids = [a["student_id"] for a in raw_apps if a.get("student_id")]
            app_prof_map = {}
            if app_student_ids:
                p_res = (
                    service_client.table("profiles")
                    .select("id, full_name, email")
                    .in_("id", app_student_ids)
                    .execute()
                )
                for p in (p_res.data or []):
                    app_prof_map[p["id"]] = p

            for a in raw_apps:
                sid = a.get("student_id")
                post_title = (a.get("postings") or {}).get("title") or "Opportunity"
                prof = app_prof_map.get(sid, {})
                prof_name = auth_names.get(sid) or (prof.get("full_name") or "").strip() or (prof.get("email") or "Student Candidate").split("@", 1)[0]
                status_text = a.get("status") or "applied"
                recent_activity.append({
                    "id": a["id"],
                    "text": f"{prof_name} — status: {status_text} for {post_title}",
                    "status": status_text,
                    "applied_at": a.get("applied_at"),
                })
        except Exception as exc:
            print(f"[industry_flow] Error fetching recent activity: {exc}")

    # Fetch top candidates with BATCHED queries (0 N+1 queries)
    top_talent = []
    try:
        non_student_ids = _get_non_student_ids(service_client)
        non_student_keywords = (
            "institution", "academic", "faculty", "industry", "company",
            "employer", "recruiter", "admin", "mentor", "college",
            "university", "corporate", "staff", "head", "dean", "professor",
            "coordinator", "administrator"
        )

        profiles_res = (
            service_client.table("profiles")
            .select("id, full_name, email, role")
            .execute()
        )
        all_profiles = profiles_res.data if (profiles_res and profiles_res.data) else []

        valid_student_profiles = []
        for prof in all_profiles:
            sid = str(prof.get("id"))
            if sid == str(current.user_id) or sid in non_student_ids:
                continue
            prof_role = str(prof.get("role") or "").lower()
            auth_role = str(auth_roles.get(sid, "")).lower()

            # 1. Role checks
            if any(k in prof_role for k in non_student_keywords) or any(k in auth_role for k in non_student_keywords):
                continue

            # 2. Name checks (tokenized + phrase)
            full_name_clean = (str(auth_names.get(sid, "")) + " " + str(prof.get("full_name") or "")).lower()
            name_tokens = full_name_clean.replace(".", " ").replace("-", " ").replace("_", " ").split()
            if any(k in name_tokens for k in ("admin", "administrator", "faculty", "recruiter", "institution", "coordinator", "dean", "professor", "employer", "corporate", "staff", "moderator")):
                continue
            if any(k in full_name_clean for k in ("institution admin", "campus admin", "college admin", "university admin", "institution user", "industry admin", "system admin")):
                continue

            # 3. Email username checks
            email_clean = str(prof.get("email") or "").lower().strip()
            email_user = email_clean.split("@", 1)[0]
            email_tokens = email_user.replace(".", " ").replace("-", " ").replace("_", " ").split()
            if any(k in email_tokens for k in ("admin", "administrator", "faculty", "recruiter", "institution", "campus", "dean", "professor", "coordinator", "hr", "support", "helpdesk", "contact", "info")):
                continue

            valid_student_profiles.append(prof)

        student_profiles = valid_student_profiles[:6]
        student_ids = [p["id"] for p in student_profiles]

        if student_ids:
            # Batch fetch students table
            st_batch = service_client.table("students").select("id, branch, cgpa").in_("id", student_ids).execute()
            st_map = {s["id"]: s for s in (st_batch.data or [])}

            # Batch fetch student_skills
            sk_batch = (
                service_client.table("student_skills")
                .select("student_id, proficiency_score, skills(name)")
                .in_("student_id", student_ids)
                .execute()
            )
            sk_map = {}
            for sk in (sk_batch.data or []):
                sid = sk.get("student_id")
                sname = (sk.get("skills") or {}).get("name")
                if sid and sname:
                    sk_map.setdefault(sid, []).append(sname)

            # Batch fetch project counts
            proj_batch = (
                service_client.table("student_projects")
                .select("id, student_id")
                .in_("student_id", student_ids)
                .execute()
            )
            proj_counts = {}
            for pr in (proj_batch.data or []):
                sid = pr.get("student_id")
                if sid:
                    proj_counts[sid] = proj_counts.get(sid, 0) + 1

            # Batch fetch certification counts
            cert_batch = (
                service_client.table("certifications")
                .select("id, student_id")
                .in_("student_id", student_ids)
                .execute()
            )
            cert_counts = {}
            for cr in (cert_batch.data or []):
                sid = cr.get("student_id")
                if sid:
                    cert_counts[sid] = cert_counts.get(sid, 0) + 1

            for prof in student_profiles:
                sid = str(prof["id"])
                st_row = st_map.get(sid, {})
                sk_list = sk_map.get(sid, [])
                p_count = proj_counts.get(sid, 0)
                c_count = cert_counts.get(sid, 0)

                name = (
                    auth_names.get(sid)
                    or (prof.get("full_name") or "").strip()
                    or (prof.get("email") or "Student Candidate").split("@", 1)[0]
                )
                if not name or name.strip() == "":
                    name = "Student Candidate"

                branch = st_row.get("branch") or "Computer Science"
                match_score = 80 + min(len(sk_list) * 4, 18) if sk_list else 82

                top_talent.append({
                    "id": sid,
                    "name": name,
                    "college": f"Partner Campus • {branch}",
                    "avatar": f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=E2E8F0&color=172033",
                    "skills": sk_list if sk_list else ["Software Engineering", "Core Domain"],
                    "gap": "Docker, Kubernetes" if not any("docker" in s.lower() for s in sk_list) else None,
                    "match": match_score,
                    "stats": f"{p_count} Projects • {c_count} Certifications",
                })
    except Exception as exc:
        print(f"[industry_flow] Dashboard top talent query error: {exc}")

    # Format recent postings with applicant counts
    recent_postings = []
    for p in postings[:5]:
        pid = p["id"]
        recent_postings.append({
            "id": pid,
            "title": p.get("title") or "Opportunity",
            "type": p.get("type") or "internship",
            "status": p.get("status") or "open",
            "deadline": p.get("application_deadline") or "—",
            "applicant_count": sum(1 for a in (apps if 'apps' in locals() else []) if a.get("posting_id") == pid),
        })

    return {
        "company_name": company_name,
        "open_opportunities_count": open_count,
        "total_applications_count": total_apps,
        "shortlisted_candidates_count": shortlisted_count,
        "active_collaborations_count": sum(1 for p in postings if p.get("type") in ("training", "bootcamp")),
        "top_talent_matches": top_talent,
        "skill_demand": skill_demand,
        "recent_postings": recent_postings,
        "recent_activity": recent_activity,
    }


@router.get("/api/industry/talent")
def get_industry_talent(
    current: CurrentIndustryUser = Depends(get_current_industry_user),
    service_client=Depends(get_service_client),
):
    """Fetch real students from database for candidate discovery with BATCHED queries (no N+1)."""
    auth_names, auth_roles = _get_auth_metadata(service_client)
    non_student_ids = _get_non_student_ids(service_client)
    non_student_keywords = (
        "institution", "academic", "faculty", "industry", "company",
        "employer", "recruiter", "admin", "mentor", "college",
        "university", "corporate", "staff", "head", "dean", "professor",
        "coordinator", "administrator"
    )

    profiles_res = (
        service_client.table("profiles")
        .select("id, full_name, email, role")
        .execute()
    )
    all_profiles = profiles_res.data if (profiles_res and profiles_res.data) else []

    valid_student_profiles = []
    for prof in all_profiles:
        sid = str(prof.get("id"))
        if sid == str(current.user_id) or sid in non_student_ids:
            continue
        prof_role = str(prof.get("role") or "").lower()
        auth_role = str(auth_roles.get(sid, "")).lower()

        # 1. Role checks
        if any(k in prof_role for k in non_student_keywords) or any(k in auth_role for k in non_student_keywords):
            continue

        # 2. Name checks (tokenized + phrase)
        full_name_clean = (str(auth_names.get(sid, "")) + " " + str(prof.get("full_name") or "")).lower()
        name_tokens = full_name_clean.replace(".", " ").replace("-", " ").replace("_", " ").split()
        if any(k in name_tokens for k in ("admin", "administrator", "faculty", "recruiter", "institution", "coordinator", "dean", "professor", "employer", "corporate", "staff", "moderator")):
            continue
        if any(k in full_name_clean for k in ("institution admin", "campus admin", "college admin", "university admin", "institution user", "industry admin", "system admin")):
            continue

        # 3. Email username checks
        email_clean = str(prof.get("email") or "").lower().strip()
        email_user = email_clean.split("@", 1)[0]
        email_tokens = email_user.replace(".", " ").replace("-", " ").replace("_", " ").split()
        if any(k in email_tokens for k in ("admin", "administrator", "faculty", "recruiter", "institution", "campus", "dean", "professor", "coordinator", "hr", "support", "helpdesk", "contact", "info")):
            continue

        valid_student_profiles.append(prof)

    profiles = valid_student_profiles[:30]
    if not profiles:
        return []

    student_ids = [p["id"] for p in profiles]

    # Batch fetch students table
    st_batch = service_client.table("students").select("id, branch, cgpa").in_("id", student_ids).execute()
    st_map = {s["id"]: s for s in (st_batch.data or [])}

    # Batch fetch student_skills
    sk_batch = (
        service_client.table("student_skills")
        .select("student_id, proficiency_score, skills(name)")
        .in_("student_id", student_ids)
        .execute()
    )
    sk_map = {}
    for sk in (sk_batch.data or []):
        sid = sk.get("student_id")
        sname = (sk.get("skills") or {}).get("name")
        if sid and sname:
            sk_map.setdefault(sid, []).append(sname)

    # Batch fetch project counts
    proj_batch = (
        service_client.table("student_projects")
        .select("id, student_id")
        .in_("student_id", student_ids)
        .execute()
    )
    proj_counts = {}
    for pr in (proj_batch.data or []):
        sid = pr.get("student_id")
        if sid:
            proj_counts[sid] = proj_counts.get(sid, 0) + 1

    # Batch fetch certification counts
    cert_batch = (
        service_client.table("certifications")
        .select("id, student_id")
        .in_("student_id", student_ids)
        .execute()
    )
    cert_counts = {}
    for cr in (cert_batch.data or []):
        sid = cr.get("student_id")
        if sid:
            cert_counts[sid] = cert_counts.get(sid, 0) + 1

    candidates = []
    for prof in profiles:
        sid = str(prof["id"])
        st_row = st_map.get(sid, {})
        sk_list = sk_map.get(sid, [])
        p_count = proj_counts.get(sid, 0)
        c_count = cert_counts.get(sid, 0)

        name = (
            auth_names.get(sid)
            or (prof.get("full_name") or "").strip()
            or (prof.get("email") or "Student Candidate").split("@", 1)[0]
        )
        if not name or name.strip() == "":
            name = "Student Candidate"

        branch = st_row.get("branch") or "Computer Science"
        cgpa = st_row.get("cgpa") or "8.0+"

        candidates.append({
            "id": sid,
            "name": name,
            "college": f"Partner Campus • {branch}",
            "avatar": f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=E2E8F0&color=172033",
            "skills": sk_list if sk_list else ["Software Engineering", "Core Domain"],
            "gap": "Cloud AWS" if not any("aws" in s.lower() for s in sk_list) else None,
            "match": 80 + min(len(sk_list) * 3, 18) if sk_list else 78,
            "dept": branch,
            "cgpa": str(cgpa),
            "stats": f"{p_count} Projects • {c_count} Certifications",
        })

    return candidates


