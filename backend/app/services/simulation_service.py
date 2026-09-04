from __future__ import annotations

from fastapi import HTTPException, status
from supabase import Client

from app.services import repository as repo
from app.services.matching_engine import compute_match


def simulate_improvement(
    client: Client,
    student_id: str,
    posting_id: str,
    skill_improvements: list[dict],  # [{"skill_id": ..., "target_level": ...}]
) -> dict:
    """
    Pure what-if: recomputes match score with hypothetical skill levels
    substituted in. Explicitly does NOT write to `recommendations` or
    `student_skills` — this is scratch space for the student, not a fact
    about them, per the approved decision.
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
    current_levels = repo.student_skill_levels(skill_rows)

    current_result = compute_match(current_levels, required)

    simulated_levels = dict(current_levels)
    for imp in skill_improvements:
        simulated_levels[imp["skill_id"]] = imp["target_level"]
    simulated_result = compute_match(simulated_levels, required)

    current_by_skill = {d.skill_id: d for d in current_result.breakdown}
    simulated_by_skill = {d.skill_id: d for d in simulated_result.breakdown}

    breakdown = []
    for skill_id, sim_detail in simulated_by_skill.items():
        cur_detail = current_by_skill.get(skill_id)
        cur_contribution = cur_detail.contribution_score if cur_detail else 0.0
        breakdown.append({
            "skill_id": skill_id,
            "skill": sim_detail.skill_name,
            "current": cur_detail.current_level if cur_detail else 0.0,
            "target": sim_detail.current_level,
            "contribution_delta": round(sim_detail.contribution_score - cur_contribution, 2),
        })
    # Surface changed skills first, most-improved at top
    breakdown.sort(key=lambda b: b["contribution_delta"], reverse=True)

    return {
        "posting_id": posting_id,
        "current_score": current_result.match_score,
        "simulated_score": simulated_result.match_score,
        "delta": round(simulated_result.match_score - current_result.match_score, 2),
        "skill_breakdown": breakdown,
    }
