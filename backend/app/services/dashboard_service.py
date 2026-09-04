from __future__ import annotations

from supabase import Client

from app.services import repository as repo
from app.services.profile_service import analyze_profile


def get_dashboard(client: Client, student_id: str) -> dict:
    """
    Per the approved decision: this endpoint NEVER triggers AI recompute or
    writes to Supabase. It only reads the student's own live profile data
    (cheap, RLS-scoped, no external writes) plus whatever `recommendations` /
    `skill_gaps` rows already exist. If no cached AI results exist yet, it
    returns status="analysis_required" so the frontend can show an explicit
    "Analyze My Profile" / "Generate AI Insights" call to action, instead of
    silently triggering paid/expensive computation on every page load.
    """
    student = repo.fetch_student_row(client, student_id) or {}
    profile = analyze_profile(client, student_id)  # read-only, no writes, cheap

    cached_recs = repo.fetch_cached_recommendations(client, student_id, limit=1)
    cached_gaps = repo.fetch_cached_skill_gaps(client, student_id)

    if not cached_recs and not cached_gaps:
        return {
            "status": "analysis_required",
            "profile_completion": profile["profile_completeness"],
            "message": (
                "No AI insights yet. Use 'Analyze My Profile' to generate "
                "your first recommendations and skill gap analysis."
            ),
        }

    top_recommendation = None
    if cached_recs:
        row = cached_recs[0]
        posting = row.get("postings") or {}
        company = (posting.get("companies") or {}).get("name", "Unknown")
        top_recommendation = {
            "posting_id": row["posting_id"],
            "title": posting.get("title", "Unknown posting"),
            "company": company,
            "match_score": row["match_score"],
        }

    top_skill_gap = None
    if cached_gaps:
        top = cached_gaps[0]  # already ordered by gap desc in repo
        skill = (top.get("skills") or {}).get("name", "Unknown")
        top_skill_gap = {"skill": skill, "gap": top["gap"], "priority": top["priority"]}

    verified_count = len(profile["verified_skills"])
    industry_readiness = cached_recs[0]["match_score"] if cached_recs else None

    return {
        "status": "ready",
        "profile_completion": profile["profile_completeness"],
        "industry_readiness": industry_readiness,
        "verified_skills_count": verified_count,
        "top_recommendation": top_recommendation,
        "top_skill_gap": top_skill_gap,
        "is_placed": bool(student.get("is_placed")),
    }
