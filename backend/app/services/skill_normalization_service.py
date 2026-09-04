"""
Phase 2: skill normalization.

Pipeline (per the approved design):
    AI extracted skill name
        -> normalize text
        -> exact canonical match
        -> alias/synonym match (public.skill_aliases)
        -> fuzzy match (rapidfuzz, against canonical skill names)
        -> [semantic match — not implemented; see NOTE below]
        -> canonical skills.id, or unmatched

Unknown skills NEVER create new rows in public.skills. If a skill can't be
confidently mapped, it's recorded in extracted_skill_candidates with
status="unmatched" and is NOT written to student_skills.

NOTE on semantic matching: the pipeline diagram in the Phase 2 spec lists
semantic matching as optional/last-resort. Embedding every canonical skill
name to support this would add real cost (and a second embedding cache to
keep consistent) for a step that, in practice, rarely catches anything
exact+alias+fuzzy matching already missed. It's left as an explicit,
documented gap for Phase 3 rather than a half-built feature here — see
skill_normalization_service.SEMANTIC_MATCHING_IMPLEMENTED.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from rapidfuzz import fuzz, process

from app.schemas.ai_processing import ExtractedSkillItem, SkillCandidateSummary
from app.services import repository as repo

SEMANTIC_MATCHING_IMPLEMENTED = False

_WHITESPACE_RE = re.compile(r"\s+")
# Keep letters, numbers, '+' and '#' (so "C++" / "C#" survive normalization),
# drop everything else (punctuation, symbols).
_STRIP_RE = re.compile(r"[^a-z0-9+#\s]")


def normalize_text(raw: str) -> str:
    text = raw.strip().lower()
    text = _STRIP_RE.sub(" ", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


@dataclass
class NormalizationResult:
    skill_id: str | None
    matched_skill_name: str | None
    normalized_skill_name: str
    confidence: float  # 0.0 when unmatched
    method: str  # "exact" | "alias" | "fuzzy" | "unmatched"


def normalize_skill_name(
    raw_skill_name: str,
    canonical_skills: list[dict],  # [{"id": ..., "name": ...}]
    alias_map: dict[str, str],  # normalized alias -> skill_id
    fuzzy_threshold: int,
) -> NormalizationResult:
    normalized = normalize_text(raw_skill_name)

    if not normalized:
        return NormalizationResult(None, None, normalized, 0.0, "unmatched")

    # Build once per call is wasteful across many items, so callers should
    # prefer normalize_skill_names_bulk() below for a real batch. This
    # single-item version is kept for clarity/testability.
    by_normalized_name = {normalize_text(s["name"]): s for s in canonical_skills}

    # 1. Exact canonical match
    exact = by_normalized_name.get(normalized)
    if exact:
        return NormalizationResult(exact["id"], exact["name"], normalized, 1.0, "exact")

    # 2. Alias / synonym match
    alias_skill_id = alias_map.get(normalized)
    if alias_skill_id:
        matched = next((s for s in canonical_skills if s["id"] == alias_skill_id), None)
        if matched:
            return NormalizationResult(matched["id"], matched["name"], normalized, 0.95, "alias")

    # 3. Fuzzy match
    if canonical_skills:
        choices = {s["id"]: normalize_text(s["name"]) for s in canonical_skills}
        best = process.extractOne(
            normalized, choices, scorer=fuzz.WRatio, score_cutoff=fuzzy_threshold
        )
        if best:
            matched_normalized_name, score, skill_id = best
            matched = next((s for s in canonical_skills if s["id"] == skill_id), None)
            if matched:
                return NormalizationResult(
                    matched["id"], matched["name"], normalized, round(score / 100.0, 3), "fuzzy"
                )

    # 4. Semantic match — not implemented (see module docstring)

    return NormalizationResult(None, None, normalized, 0.0, "unmatched")


def normalize_and_store(
    *,
    client,
    service_client,
    student_id: str,
    resume_id: str,
    extracted_items: list[ExtractedSkillItem],
    fuzzy_threshold: int,
    min_normalization_confidence: float,
    ai_default_proficiency_score: float,
    ai_default_proficiency_label: str,
    provider_name: str,
    model_name: str,
) -> dict:
    """
    Runs every extracted item through normalize_skill_name(), writes one
    audit row per item to extracted_skill_candidates regardless of
    outcome, and safely upserts student_skills only for confident matches.

    Returns:
        {
            "matched": int, "unmatched": int,
            "candidates": list[SkillCandidateSummary],
            "matched_skill_names": list[str],  # for the profile document
        }
    """
    canonical_skills = repo.fetch_all_skills(client)
    try:
        alias_map = {
            normalize_text(alias): skill_id
            for alias, skill_id in repo.fetch_skill_aliases(client).items()
        }
    except Exception:
        # The deployed schema has no skill_aliases table; exact/fuzzy matching
        # against the canonical skills table remains fully functional.
        alias_map = {}
    by_normalized_name = {normalize_text(s["name"]): s for s in canonical_skills}

    matched_count = 0
    unmatched_count = 0
    summaries: list[SkillCandidateSummary] = []
    matched_skill_names: list[str] = []

    for item in extracted_items:
        result = _normalize_one(item.skill_name, canonical_skills, by_normalized_name, alias_map, fuzzy_threshold)

        note: str | None = None
        status = "unmatched"

        if result.skill_id and result.confidence >= min_normalization_confidence:
            status = "matched"
            matched_count += 1
            matched_skill_names.append(result.matched_skill_name or item.skill_name)

            existing = repo.fetch_student_skill(client, student_id, result.skill_id)
            if existing and existing.get("is_verified"):
                note = "Skill already verified by the student — left unchanged."
            else:
                existing_score = float(existing.get("proficiency_score") or 0) if existing else 0.0
                final_score = max(existing_score, ai_default_proficiency_score)
                repo.upsert_student_skill_ai(
                    service_client,
                    student_id=student_id,
                    skill_id=result.skill_id,
                    proficiency_score=final_score,
                    proficiency_label=ai_default_proficiency_label,
                )
        else:
            unmatched_count += 1
            note = "No confident canonical match found; not written to student_skills."

        repo.insert_skill_candidate(
            service_client,
            {
                "student_id": student_id,
                "resume_id": resume_id,
                "raw_skill_name": item.skill_name,
                "normalized_skill_name": result.normalized_skill_name,
                "skill_id": result.skill_id,
                "extraction_confidence": round(item.confidence, 3),
                "normalization_confidence": result.confidence if result.skill_id else None,
                "status": status,
                "note": note,
                "source": "ai_estimated",
                "provider": provider_name,
                "model": model_name,
            },
        )

        summaries.append(
            SkillCandidateSummary(
                raw_skill_name=item.skill_name,
                normalized_skill_name=result.normalized_skill_name,
                matched_skill_name=result.matched_skill_name,
                status=status,
                extraction_confidence=round(item.confidence, 3),
                normalization_confidence=result.confidence if result.skill_id else None,
                note=note,
            )
        )

    return {
        "matched": matched_count,
        "unmatched": unmatched_count,
        "candidates": summaries,
        "matched_skill_names": matched_skill_names,
    }


def _normalize_one(
    raw_skill_name: str,
    canonical_skills: list[dict],
    by_normalized_name: dict[str, dict],
    alias_map: dict[str, str],
    fuzzy_threshold: int,
) -> NormalizationResult:
    """Same logic as normalize_skill_name(), but reuses a pre-built lookup
    table across a whole batch instead of rebuilding it per item."""
    normalized = normalize_text(raw_skill_name)
    if not normalized:
        return NormalizationResult(None, None, normalized, 0.0, "unmatched")

    exact = by_normalized_name.get(normalized)
    if exact:
        return NormalizationResult(exact["id"], exact["name"], normalized, 1.0, "exact")

    alias_skill_id = alias_map.get(normalized)
    if alias_skill_id:
        matched = next((s for s in canonical_skills if s["id"] == alias_skill_id), None)
        if matched:
            return NormalizationResult(matched["id"], matched["name"], normalized, 0.95, "alias")

    if canonical_skills:
        choices = {s["id"]: normalize_text(s["name"]) for s in canonical_skills}
        best = process.extractOne(
            normalized, choices, scorer=fuzz.WRatio, score_cutoff=fuzzy_threshold
        )
        if best:
            _matched_normalized_name, score, skill_id = best
            matched = next((s for s in canonical_skills if s["id"] == skill_id), None)
            if matched:
                return NormalizationResult(
                    matched["id"], matched["name"], normalized, round(score / 100.0, 3), "fuzzy"
                )

    return NormalizationResult(None, None, normalized, 0.0, "unmatched")
