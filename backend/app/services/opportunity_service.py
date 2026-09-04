from __future__ import annotations

from supabase import Client

from app.services import repository as repo
from app.services.matching_engine import compute_match


def match_opportunities(
    client: Client,
    service_client: Client,
    student_id: str,
    domain_id: str | None = None,
    posting_type: str | None = None,
    refresh: bool = False,
) -> list[dict]:
    """
    If refresh=False and cached recommendations already exist for this
    student, returns those (fast path — no recompute, no writes).
    If refresh=True, or no cache exists, recomputes against currently open
    postings and upserts fresh rows into `recommendations`.
    """
    if not refresh:
        cached = repo.fetch_cached_recommendations(client, student_id)
        if cached:
            return [_row_to_item(r) for r in cached]

    skill_rows = repo.fetch_student_skills(client, student_id)
    levels = repo.student_skill_levels(skill_rows)

    postings = repo.fetch_open_postings(client, domain_id=domain_id, posting_type=posting_type)

    results = []
    for posting in postings:
        required = repo.fetch_posting_required_skills(client, posting["id"])
        if not required:
            continue
        match = compute_match(levels, required)
        upsert_recommendation_safe(service_client, student_id, posting["id"], match)
        company_name = (posting.get("companies") or {}).get("name", "Unknown")
        results.append({
            "posting_id": posting["id"],
            "title": posting["title"],
            "company": company_name,
            "match_score": match.match_score,
            "matched_skills": match.matched_skills,
            "missing_skills": match.missing_skills,
            "reason": match.reason,
        })

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results


def upsert_recommendation_safe(service_client: Client, student_id: str, posting_id: str, match) -> None:
    repo.upsert_recommendation(service_client, student_id, posting_id, match)


def _row_to_item(row: dict) -> dict:
    posting = row.get("postings") or {}
    company = (posting.get("companies") or {}).get("name", "Unknown")
    return {
        "posting_id": row["posting_id"],
        "title": posting.get("title", "Unknown posting"),
        "company": company,
        "match_score": row["match_score"],
        "matched_skills": row.get("matched_skills") or [],
        "missing_skills": row.get("missing_skills") or [],
        "reason": row.get("reason") or "",
    }
