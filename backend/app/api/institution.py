"""
Institution API — Student Readiness endpoints.

Security model:
  - All endpoints require a valid Supabase JWT whose corresponding
    profiles.role is 'institution' (or an accepted alias).
  - All database reads use the service-role client, which bypasses RLS.
    This is necessary because RLS policies on student tables are
    own-row-only (student_id = auth.uid()); institution users cannot
    read other students' rows via the scoped client.
  - The service-role key is never exposed to the frontend.
"""

import logging
import uuid as _uuid
from app.services import repository as repo
from fastapi import APIRouter, Depends, HTTPException, status

from app.deps.auth import CurrentInstitutionUser, get_current_institution_user
from app.deps.supabase_clients import get_service_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/institution", tags=["institution"])


def _compute_readiness(skills: list[dict]) -> float | None:
    """
    Return the average proficiency_score across a student's skill rows.
    Returns None when the student has no skill rows at all (not enough data).
    """
    scores = [
        s["proficiency_score"]
        for s in skills
        if s.get("proficiency_score") is not None
    ]
    if not scores:
        return None
    return round(sum(scores) / len(scores), 1)


def _initials(name: str) -> str:
    parts = (name or "").split()
    if not parts:
        return "?"
    return "".join(p[0].upper() for p in parts if p)[:2]


_INSTITUTION_AUTH_META_CACHE: tuple[float, tuple[dict[str, str], dict[str, str]]] = (0.0, ({}, {}))


def _get_institution_auth_metadata(svc) -> tuple[dict[str, str], dict[str, str]]:
    global _INSTITUTION_AUTH_META_CACHE
    import time
    now = time.time()
    cached_time, cached_data = _INSTITUTION_AUTH_META_CACHE
    if (now - cached_time < 60) and (cached_data[0] or cached_data[1]):
        return cached_data

    auth_names_by_id: dict[str, str] = {}
    auth_roles_by_id: dict[str, str] = {}
    try:
        auth_resp = svc.auth.admin.list_users()
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
        _INSTITUTION_AUTH_META_CACHE = (now, (auth_names_by_id, auth_roles_by_id))
    except Exception as exc:
        logger.warning("Could not fetch auth users for metadata names/roles: %s", exc)
        if cached_data[0] or cached_data[1]:
            return cached_data
    return auth_names_by_id, auth_roles_by_id


@router.get("/students")
def list_students(
    current_user: CurrentInstitutionUser = Depends(get_current_institution_user),
):
    """
    Return all student profiles with their skills and computed readiness score.

    One round-trip: students joined with profiles, domains, and student_skills+skills.
    Portfolio details are NOT loaded here — fetched on demand via /students/{id}/portfolio.
    """
    svc = get_service_client()

    try:
        # ── 1. Fetch all student rows joined with profile and domain ──────────
        student_res = (
            svc.table("students")
            .select(
                "id, bio, domain_id, is_placed, onboarding_completed, "
                "portfolio_url, github_url, linkedin_url, resume_url, "
                "profiles!inner(full_name, email, role), "
                "domains(name)"
            )
            .execute()
        )
        rows = student_res.data or []

        # ── 2. Fetch auth user metadata to get up-to-date chosen names and roles ─────
        auth_names_by_id, auth_roles_by_id = _get_institution_auth_metadata(svc)

        non_student_ids: set[str] = set()
        try:
            comp_res = svc.table("companies").select("admin_profile_id").execute()
            for c in (comp_res.data or []):
                aid = c.get("admin_profile_id")
                if aid:
                    non_student_ids.add(str(aid))
        except Exception as exc:
            logger.warning("Could not fetch company admin IDs: %s", exc)

        try:
            post_res = svc.table("postings").select("posted_by").execute()
            for p in (post_res.data or []):
                pby = p.get("posted_by")
                if pby:
                    non_student_ids.add(str(pby))
        except Exception as exc:
            logger.warning("Could not fetch postings posted_by IDs: %s", exc)

        non_student_keywords = (
            "institution", "academic", "faculty", "industry", "company",
            "employer", "recruiter", "admin", "mentor", "college",
            "university", "corporate", "staff", "head", "dean", "professor",
            "coordinator", "administrator"
        )
        def _is_valid_student(r):
            sid = str(r["id"])
            if sid == str(current_user.user_id):
                return False
            if sid in non_student_ids:
                return False
            prof = r.get("profiles") or {}
            prof_role = str(prof.get("role") or "").lower()
            auth_role = str(auth_roles_by_id.get(sid, "")).lower()

            # 1. Role checks
            if any(k in prof_role for k in non_student_keywords) or any(k in auth_role for k in non_student_keywords):
                return False

            # 2. Name checks (tokenized + phrase)
            full_name_clean = (str(auth_names_by_id.get(sid, "")) + " " + str(prof.get("full_name") or "")).lower()
            name_tokens = full_name_clean.replace(".", " ").replace("-", " ").replace("_", " ").split()
            if any(k in name_tokens for k in ("admin", "administrator", "faculty", "recruiter", "institution", "coordinator", "dean", "professor", "employer", "corporate", "staff", "moderator")):
                return False
            if any(k in full_name_clean for k in ("institution admin", "campus admin", "college admin", "university admin", "institution user", "industry admin", "system admin")):
                return False

            # 3. Email username checks (e.g. admin@..., faculty@..., institution@...)
            email_clean = str(prof.get("email") or "").lower().strip()
            email_user = email_clean.split("@", 1)[0]
            email_tokens = email_user.replace(".", " ").replace("-", " ").replace("_", " ").split()
            if any(k in email_tokens for k in ("admin", "administrator", "faculty", "recruiter", "institution", "campus", "dean", "professor", "coordinator", "hr", "support", "helpdesk", "contact", "info")):
                return False

            return True

        rows = [r for r in rows if _is_valid_student(r)]

        if not rows:
            return {"students": []}

        student_ids = [r["id"] for r in rows]

        # ── 3. Fetch student_skills for all students in one query ─────────────
        skills_res = (
            svc.table("student_skills")
            .select(
                "student_id, skill_id, proficiency_score, is_verified, "
                "source, self_report_score, assessment_score, evidence_score, "
                "skills!inner(name)"
            )
            .in_("student_id", student_ids)
            .execute()
        )
        all_skills = skills_res.data or []

        # Index skills by student_id
        skills_by_student: dict[str, list[dict]] = {}
        for sk in all_skills:
            sid = sk["student_id"]
            skills_by_student.setdefault(sid, []).append(sk)

        # ── 4. Assemble response ──────────────────────────────────────────────
        students_out = []
        for row in rows:
            sid = row["id"]
            profile = row.get("profiles") or {}
            domain = row.get("domains") or {}

            raw_skills = skills_by_student.get(sid, [])

            # Build skill list for the table (sorted with verified & highest proficiency first)
            skill_list = [
                {
                    "name": sk["skills"]["name"],
                    "is_verified": bool(sk.get("is_verified")),
                    "proficiency_score": sk.get("proficiency_score"),
                    "source": sk.get("source"),
                }
                for sk in raw_skills
            ]
            skill_list.sort(
                key=lambda s: (1 if s["is_verified"] else 0, s["proficiency_score"] or 0),
                reverse=True,
            )

            readiness_score = _compute_readiness(raw_skills)

            # Prioritize student's chosen name from Supabase Auth metadata over stale profiles.full_name
            full_name = (
                auth_names_by_id.get(sid)
                or (profile.get("full_name") or "").strip()
                or profile.get("email", "Unknown")
            )

            students_out.append(
                {
                    "id": sid,
                    "full_name": full_name,
                    "email": profile.get("email", ""),
                    "initials": _initials(full_name),
                    "domain": domain.get("name"),
                    "bio": row.get("bio"),
                    "is_placed": bool(row.get("is_placed")),
                    "onboarding_completed": bool(row.get("onboarding_completed")),
                    "portfolio_url": row.get("portfolio_url"),
                    "github_url": row.get("github_url"),
                    "linkedin_url": row.get("linkedin_url"),
                    "skills": skill_list,
                    "readiness_score": readiness_score,
                    "source": "database",
                }
            )

        return {"students": students_out}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error fetching institution student list: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch student list.",
        ) from exc


@router.get("/students/{student_id}/portfolio")
def get_student_portfolio(
    student_id: str,
    current_user: CurrentInstitutionUser = Depends(get_current_institution_user),
):
    """
    Return one student's portfolio detail: verified skills, certifications, and projects.

    Only fetched when the institution user clicks 'View Portfolio' — not on initial load.
    """
    # Validate student_id is a proper UUID to prevent injection / enumeration
    try:
        _uuid.UUID(student_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid student_id format.",
        )

    svc = get_service_client()

    try:
        # ── Verify the student exists and is actually a student-role user ─────
        profile_res = (
            svc.table("profiles")
            .select("id, full_name, email, role")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        )
        profile = profile_res.data if profile_res else None

        if not profile or profile.get("role") != "student":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found.",
            )

        # ── Fetch student row for domain ──────────────────────────────────────
        student_res = (
            svc.table("students")
            .select("id, bio, portfolio_url, github_url, linkedin_url, domains(name)")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        )
        student = student_res.data if student_res else {}
        domain_name = (student.get("domains") or {}).get("name") if student else None

        # ── Verified skills ───────────────────────────────────────────────────
        skills_res = (
            svc.table("student_skills")
            .select("is_verified, proficiency_score, skills!inner(name)")
            .eq("student_id", student_id)
            .execute()
        )
        # Build list of verified skills for UI
        verified_skills = [
            {
                "name": sk["skills"]["name"],
                "proficiency_score": sk.get("proficiency_score"),
            }
            for sk in (skills_res.data or [])
            if sk.get("is_verified")
        ]

        # Build top_skills list (up to 15) sorted by verification then proficiency
        all_skills = skills_res.data or []
        top_skills = sorted(
            [
                {
                    "name": sk["skills"]["name"],
                    "is_verified": bool(sk.get("is_verified")),
                    "proficiency_score": sk.get("proficiency_score"),
                }
                for sk in all_skills
            ],
            key=lambda s: (1 if s["is_verified"] else 0, s["proficiency_score"] or 0),
            reverse=True,
        )[:15]

        # ── Certifications (actual schema columns) ────────────────────────────
        cert_res = (
            svc.table("certifications")
            .select("id, title, issuing_organization, issue_date, credential_url, is_verified, created_at")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .execute()
        )
        certifications = [
            {
                "id": c.get("id"),
                "title": c.get("title"),
                "issued_by": c.get("issuing_organization") or "Supporting Document",
                "issued_at": c.get("issue_date") or c.get("created_at"),
                "credential_url": c.get("credential_url"),
                "is_verified": bool(c.get("is_verified")),
            }
            for c in (cert_res.data or [])
        ]

        # ── Projects (uses student_projects migration table) ──────────────────
        proj_res = (
            svc.table("student_projects")
            .select("id, title, description, tags, project_url, start_date, end_date")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .execute()
        )
        projects = proj_res.data or []

        # Resolve student's chosen name from Auth metadata
        auth_name = None
        try:
            auth_user = svc.auth.admin.get_user_by_id(student_id)
            if auth_user:
                meta = getattr(auth_user, "user_metadata", None) or (auth_user.get("user_metadata") if isinstance(auth_user, dict) else {}) or {}
                auth_name = meta.get("full_name") or meta.get("name")
        except Exception as exc:
            logger.warning("Could not fetch auth user metadata for student %s: %s", student_id, exc)

        full_name = (
            (str(auth_name).strip() if auth_name else None)
            or (profile.get("full_name") or "").strip()
            or profile.get("email", "Unknown")
        )

        # Fetch resume status using repo helper (queries resume_processing_jobs and student.resume_url safely)
        try:
            latest_resume = repo.fetch_latest_resume(svc, student_id)
        except Exception as exc:
            logger.warning("Could not fetch resume for student %s: %s", student_id, exc)
            latest_resume = None

        has_resume = bool(latest_resume) or bool((student or {}).get("portfolio_url")) or bool((student or {}).get("resume_url"))

        # Fetch recommendations & real skill gaps from database
        recommendation_rows = repo.fetch_cached_recommendations(svc, student_id, limit=5)
        skill_gaps_list = []
        for r in recommendation_rows:
            p = r.get("postings") or {}
            c = p.get("companies") or {}
            missing = r.get("missing_skills") or []
            if missing:
                skill_gaps_list.append({
                    "posting_id": r.get("posting_id"),
                    "title": p.get("title", "Opportunity"),
                    "company": c.get("name", "Industry Partner"),
                    "match_score": r.get("match_score", 0),
                    "missing_skills": missing,
                })

        # If no cached recommendations, fetch active postings and compute real skill gaps
        if not skill_gaps_list:
            postings_res = (
                svc.table("postings")
                .select("id, title, skills_list, status, companies(name)")
                .eq("status", "open")
                .limit(6)
                .execute()
            )
            open_postings = postings_res.data or []
            student_skill_names = {
                str(s.get("name")).lower().strip()
                for s in top_skills
                if isinstance(s, dict) and s.get("name")
            }

            for p in open_postings:
                p_skills = p.get("skills_list") or []
                if isinstance(p_skills, str):
                    p_skills = [x.strip() for x in p_skills.split(",") if x.strip()]
                missing = [sk for sk in p_skills if sk.lower().strip() not in student_skill_names]
                if missing:
                    c_name = (p.get("companies") or {}).get("name", "Industry Partner")
                    matched_count = len(p_skills) - len(missing)
                    score = round((matched_count / max(len(p_skills), 1)) * 100) if p_skills else 0
                    skill_gaps_list.append({
                        "posting_id": p.get("id"),
                        "title": p.get("title", "Opportunity"),
                        "company": c_name,
                        "match_score": score,
                        "missing_skills": [{"skill": m, "gap": 50.0} for m in missing[:3]],
                    })

        return {
            "student": {
                "id": student_id,
                "full_name": full_name,
                "email": profile.get("email", ""),
                "initials": _initials(full_name),
                "domain": domain_name,
                "bio": (student or {}).get("bio"),
                "portfolio_url": (student or {}).get("portfolio_url"),
                "github_url": (student or {}).get("github_url"),
                "linkedin_url": (student or {}).get("linkedin_url"),
                "has_resume": has_resume,
                "resume_filename": (latest_resume or {}).get("file_name") or (latest_resume or {}).get("original_filename"),
            },
            "verified_skills": verified_skills,
            "top_skills": top_skills,
            "skills": top_skills,
            "has_resume": has_resume,
            "skill_gaps": skill_gaps_list,
            "certifications": certifications,
            "projects": projects,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error fetching portfolio for student %s: %s", student_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch student portfolio.",
        ) from exc


# ── Skill Demand & Deficit Gap Engine (Real Database Data) ───────────────────

def _compute_industry_demand_and_gaps(svc) -> dict:
    """
    Computes deterministic Industry Skill Demand vs Student Skill Supply:
    - Demand % = (Number of open postings requiring skill / Total open postings) * 100
    - Student Coverage % = (Number of students possessing skill / Total students) * 100
    - Deficit Gap % = max(0, Demand % - Student Coverage %)
    """
    # 1. Fetch postings
    postings_res = (
        svc.table("postings")
        .select("id, title, skills_list, status")
        .execute()
    )
    postings = postings_res.data or []
    open_postings = [p for p in postings if p.get("status") == "open"]
    if not open_postings:
        open_postings = postings

    total_postings = max(len(open_postings), 1)

    skill_posting_counts: dict[str, int] = {}
    for p in open_postings:
        raw_skills = p.get("skills_list") or []
        if isinstance(raw_skills, str):
            raw_skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
        cleaned_skills = {s.strip().title() for s in raw_skills if s and s.strip()}
        for sk in cleaned_skills:
            skill_posting_counts[sk] = skill_posting_counts.get(sk, 0) + 1

    # 2. Fetch student profiles and student skills
    prof_res = (
        svc.table("profiles")
        .select("id")
        .eq("role", "student")
        .execute()
    )
    total_students = max(len(prof_res.data or []), 1)

    skills_res = (
        svc.table("student_skills")
        .select("student_id, proficiency_score, is_verified, skills!inner(name)")
        .execute()
    )
    student_skill_map: dict[str, set[str]] = {}
    skill_proficiency_accum: dict[str, list[float]] = {}

    for row in (skills_res.data or []):
        sid = row.get("student_id")
        sname = ((row.get("skills") or {}).get("name") or "").strip().title()
        score = row.get("proficiency_score")
        if sname and sid:
            student_skill_map.setdefault(sname, set()).add(sid)
            if score is not None:
                skill_proficiency_accum.setdefault(sname, []).append(float(score))

    # 3. Combine demand and supply across all unique skills
    all_analyzed_skills = sorted(
        list(set(skill_posting_counts.keys()).union(set(student_skill_map.keys()))),
        key=lambda k: (skill_posting_counts.get(k, 0), len(student_skill_map.get(k, set()))),
        reverse=True,
    )

    demand_list = []
    mapping_list = []

    for rank, sk in enumerate(all_analyzed_skills, 1):
        demand_cnt = skill_posting_counts.get(sk, 0)
        demand_pct = round((demand_cnt / total_postings) * 100) if len(open_postings) > 0 else 0

        student_cnt = len(student_skill_map.get(sk, set()))
        student_cov_pct = round((student_cnt / total_students) * 100)

        # Average proficiency among students who have the skill
        scores = skill_proficiency_accum.get(sk, [])
        avg_proficiency = round(sum(scores) / len(scores)) if scores else student_cov_pct

        gap_pct = max(0, demand_pct - student_cov_pct)
        aligned = (demand_pct <= student_cov_pct)

        if gap_pct >= 25:
            rec = f"High Deficit: Prioritize {sk} in core curriculum and hands-on capstones."
            status_text = "Action Required"
            status_color = "danger"
        elif gap_pct > 0:
            rec = f"Moderate Gap: Conduct intensive workshops and certification drives in {sk}."
            status_text = "In Progress"
            status_color = "warning"
        else:
            rec = f"Aligned: Student proficiency in {sk} meets or exceeds current industry demand."
            status_text = "Aligned"
            status_color = "success"

        demand_list.append({
            "skill": sk,
            "demand_count": demand_cnt,
            "demand_percentage": demand_pct,
            "student_count": student_cnt,
            "student_coverage_percentage": student_cov_pct,
            "gap_percentage": gap_pct,
            "rank": rank,
        })

        mapping_list.append({
            "domain": sk,
            "demand": demand_pct,
            "proficiency": avg_proficiency,
            "gap": gap_pct,
            "aligned": aligned,
            "recommendation": rec,
            "status": status_text,
            "statusColor": status_color,
        })

    # Summary statistics
    top_skill = demand_list[0]["skill"] if demand_list else "None"
    top_demand_pct = demand_list[0]["demand_percentage"] if demand_list else 0

    highest_gap_item = max(demand_list, key=lambda x: x["gap_percentage"]) if demand_list else None
    highest_gap_name = highest_gap_item["skill"] if highest_gap_item and highest_gap_item["gap_percentage"] > 0 else "None"
    highest_gap_val = highest_gap_item["gap_percentage"] if highest_gap_item else 0

    demand_stats = [
        {
            "label": "Top Demanded Skill",
            "value": f"{top_skill} ({top_demand_pct}%)",
            "trend": f"Across {len(open_postings)} Openings",
        },
        {
            "label": "Highest Skill Deficit",
            "value": f"{highest_gap_name} ({highest_gap_val}% Deficit)",
            "trend": "Curriculum Focus",
        },
        {
            "label": "Live Analyzed Postings",
            "value": f"{len(open_postings)} Active Roles",
            "trend": f"{total_students} Enrolled Students",
        },
    ]

    return {
        "total_postings": len(open_postings),
        "total_students": total_students,
        "skills": demand_list,
        "demandStats": demand_stats,
        "skillMapping": mapping_list,
    }


@router.get("/skill-demand")
def get_institution_skill_demand(
    current_user: CurrentInstitutionUser = Depends(get_current_institution_user),
):
    """Return live skill demand statistics and ranking computed from real database records."""
    svc = get_service_client()
    return _compute_industry_demand_and_gaps(svc)


@router.get("/skill-gap")
def get_institution_skill_gap(
    current_user: CurrentInstitutionUser = Depends(get_current_institution_user),
):
    """Return comprehensive skill mapping table and deficit analysis for the Institution portal."""
    svc = get_service_client()
    return _compute_industry_demand_and_gaps(svc)

