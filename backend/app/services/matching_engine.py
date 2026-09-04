"""
Single source of truth for the match-score formula.

Every endpoint that needs "how well do these skills satisfy these
requirements" (Opportunity Matching, Skill Gap Analysis, Improvement
Simulation) calls into this module — no endpoint re-implements the formula.

Pure functions only: no Supabase, no FastAPI, no I/O. This makes it directly
unit-testable and keeps AI/business logic decoupled from data access, per
the approved architecture.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.config import get_settings


@dataclass
class RequiredSkill:
    skill_id: str
    skill_name: str
    required_level: float          # 0-100, from posting_required_skills.required_level
    importance: str = "medium"     # low / medium / high


@dataclass
class SkillDetail:
    skill_id: str
    skill_name: str
    current_level: float
    required_level: float
    contribution_score: float      # 0-100, this skill's own ratio
    weight: float
    status: str                    # "matched" | "partial" | "missing"


@dataclass
class MatchResult:
    match_score: float                         # 0-100 weighted overall score
    matched_skills: list[dict] = field(default_factory=list)
    missing_skills: list[dict] = field(default_factory=list)
    breakdown: list[SkillDetail] = field(default_factory=list)
    reason: str = ""


def compute_match(
    student_skill_levels: dict[str, float],
    required_skills: list[RequiredSkill],
) -> MatchResult:
    """
    student_skill_levels: {skill_id: proficiency_score (0-100)}
    required_skills: the posting's (or target role's) requirement rows

    Returns a MatchResult with an overall weighted match_score plus a
    per-skill breakdown so callers can render "matched vs missing" and
    reuse the same numbers for gap analysis / simulation without
    recomputing anything differently.
    """
    settings = get_settings()
    weights = settings.IMPORTANCE_WEIGHTS

    if not required_skills:
        return MatchResult(match_score=0.0, reason="No required skills defined for this posting.")

    breakdown: list[SkillDetail] = []
    weighted_sum = 0.0
    weight_total = 0.0
    matched, missing = [], []

    for req in required_skills:
        current = float(student_skill_levels.get(req.skill_id, 0.0))
        weight = weights.get(req.importance, weights["medium"])

        if req.required_level > 0:
            ratio = min(current / req.required_level, 1.0) * 100.0
        else:
            ratio = 100.0

        weighted_sum += ratio * weight
        weight_total += weight

        if current <= 0:
            status = "missing"
            missing.append({
                "skill_id": req.skill_id,
                "skill": req.skill_name,
                "gap": round(max(req.required_level - current, 0.0), 2),
            })
        elif ratio < 100.0:
            status = "partial"
            missing.append({
                "skill_id": req.skill_id,
                "skill": req.skill_name,
                "gap": round(max(req.required_level - current, 0.0), 2),
            })
        else:
            status = "matched"
            matched.append({
                "skill_id": req.skill_id,
                "skill": req.skill_name,
                "score": round(ratio, 2),
            })

        breakdown.append(SkillDetail(
            skill_id=req.skill_id,
            skill_name=req.skill_name,
            current_level=current,
            required_level=req.required_level,
            contribution_score=round(ratio, 2),
            weight=weight,
            status=status,
        ))

    overall = round(weighted_sum / weight_total, 2) if weight_total > 0 else 0.0
    reason = _build_reason(matched, missing)

    return MatchResult(
        match_score=overall,
        matched_skills=matched,
        missing_skills=missing,
        breakdown=breakdown,
        reason=reason,
    )


def gap_priority(gap: float) -> str:
    settings = get_settings()
    if gap >= settings.GAP_PRIORITY_HIGH_THRESHOLD:
        return "high"
    if gap >= settings.GAP_PRIORITY_MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def _build_reason(matched: list[dict], missing: list[dict]) -> str:
    if not matched and not missing:
        return "No comparable skills found."
    parts = []
    if matched:
        top = ", ".join(m["skill"] for m in matched[:3])
        parts.append(f"Strong match on {top}")
    if missing:
        gap_sorted = sorted(missing, key=lambda m: m["gap"], reverse=True)
        top_missing = ", ".join(m["skill"] for m in gap_sorted[:3])
        parts.append(f"missing {top_missing}")
    return "; ".join(parts)
