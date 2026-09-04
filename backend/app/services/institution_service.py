from __future__ import annotations

from fastapi import HTTPException, status
from supabase import Client

from app.services import repository as repo


def get_institution_profile(client: Client, admin_profile_id: str) -> dict:
    inst = repo.fetch_institution_for_admin(client, admin_profile_id)
    if not inst:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Institution profile not found for this account.")
    return inst


def get_dashboard(client: Client, service_client: Client, admin_profile_id: str) -> dict:
    """Platform-wide aggregate view. Known Stage-2 MVP limitation: the
    schema has no students.institution_id affiliation yet, so this shows
    aggregate stats across all students/postings rather than a specific
    institution's own cohort -- documented, not hidden. Reads use the
    service-role client (bypasses RLS) because no per-student RLS grant
    exists for the institution role; the role check itself already
    happened in get_current_institution before this is called."""
    inst = get_institution_profile(client, admin_profile_id)

    total = repo.fetch_students_count(service_client)
    placed = repo.fetch_placed_students_count(service_client)
    placement_rate = round((placed / total) * 100, 2) if total else 0.0

    gap_rows = repo.fetch_all_skill_gaps(service_client)
    agg: dict[str, dict] = {}
    for r in gap_rows:
        skill_name = (r.get("skills") or {}).get("name", "Unknown")
        gap_value = float(r.get("gap") or 0)
        entry = agg.setdefault(skill_name, {"skill": skill_name, "total_gap": 0.0, "count": 0})
        entry["total_gap"] += gap_value
        entry["count"] += 1
    top_gaps = sorted(agg.values(), key=lambda e: e["total_gap"], reverse=True)[:5]
    top_gaps_out = [
        {"skill": e["skill"], "avg_gap": round(e["total_gap"] / e["count"], 2), "student_count": e["count"]}
        for e in top_gaps
    ]

    open_postings_count = repo.fetch_open_postings_count(client)

    return {
        "institution_name": inst["name"],
        "total_students": total,
        "placed_students": placed,
        "placement_rate": placement_rate,
        "top_skill_gaps": top_gaps_out,
        "open_postings_count": open_postings_count,
    }
