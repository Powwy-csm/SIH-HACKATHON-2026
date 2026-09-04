from __future__ import annotations

from fastapi import HTTPException, status
from supabase import Client

from app.services import repository as repo
from app.services.matching_engine import compute_match


def analyze_skill_gaps(client: Client, service_client: Client, student_id: str, posting_id: str) -> dict:
    """
    Per the approved decision: posting_id is mandatory. Flow is
    posting_id -> posting_required_skills -> compare vs student_skills ->
    write skill_gaps keyed by (student_id, target_role=posting_id, skill_id).

    Using posting_id as the `target_role` key keeps this exact and avoids
    inventing a second identifier scheme — a student can have gap rows per
    posting, which is what "select an opportunity, see the gaps" requires.
    """
    posting = repo.fetch_posting(client, posting_id)
    if not posting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Posting not found.")

    required = repo.fetch_posting_required_skills(client, posting_id)
    if not required:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This posting has no required skills defined yet.",
        )

    skill_rows = repo.fetch_student_skills(client, student_id)
    levels = repo.student_skill_levels(skill_rows)

    match = compute_match(levels, required)
    repo.upsert_skill_gaps(service_client, student_id, posting_id, match)

    gaps = []
    for detail in match.breakdown:
        gap_value = round(max(detail.required_level - detail.current_level, 0.0), 2)
        gaps.append({
            "skill_id": detail.skill_id,
            "skill": detail.skill_name,
            "current_level": detail.current_level,
            "required_level": detail.required_level,
            "gap": gap_value,
            "priority": _priority_for(gap_value),
        })
    gaps.sort(key=lambda g: g["gap"], reverse=True)

    company_name = (posting.get("companies") or {}).get("name", "Unknown")
    return {
        "posting_id": posting_id,
        "target_title": f"{posting.get('title', 'Unknown')} @ {company_name}",
        "gaps": gaps,
    }


def _priority_for(gap: float) -> str:
    from app.services.matching_engine import gap_priority
    return gap_priority(gap)
