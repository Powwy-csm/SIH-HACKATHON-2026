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

        # Filter to only student records and exclude current user if they have an auto-provisioned student row
        rows = [
            r for r in rows
            if r["id"] != current_user.user_id
        ]

        if not rows:
            return {"students": []}

        student_ids = [r["id"] for r in rows]

        # ── 2. Fetch student_skills for all students in one query ─────────────
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

        # ── 3. Assemble response ──────────────────────────────────────────────
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

            full_name = (profile.get("full_name") or "").strip() or profile.get("email", "Unknown")

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
        verified_skills = [
            {
                "name": sk["skills"]["name"],
                "proficiency_score": sk.get("proficiency_score"),
            }
            for sk in (skills_res.data or [])
            if sk.get("is_verified")
        ]

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

        full_name = (profile.get("full_name") or "").strip() or profile.get("email", "Unknown")

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
            },
            "verified_skills": verified_skills,
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
