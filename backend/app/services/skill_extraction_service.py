"""
Phase 2: AI-based skill extraction from resume text.

Reads only from `resumes.extracted_text` (Phase 1 output) — never
re-downloads or re-parses the resume file itself.
"""
from __future__ import annotations

from pydantic import ValidationError

from app.deps.ai_clients import AIProvider, AIProviderError
from app.schemas.ai_processing import ExtractedSkillItem


class SkillExtractionError(Exception):
    """Raised when the AI provider fails, or returns data that can't be
    validated into a safe, structured shape. Callers turn this into a
    clean HTTP error — the database is never touched with unvalidated
    provider output."""


def extract_skills(resume_text: str, ai_provider: AIProvider) -> list[ExtractedSkillItem]:
    if not resume_text or not resume_text.strip():
        raise SkillExtractionError("Resume has no extracted text to analyze.")

    try:
        raw_items = ai_provider.extract_skills(resume_text)
    except AIProviderError as exc:
        raise SkillExtractionError(f"AI provider failed during skill extraction: {exc}") from exc

    validated: list[ExtractedSkillItem] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            continue  # skip malformed entries rather than failing the whole batch
        try:
            validated.append(ExtractedSkillItem(**raw_item))
        except ValidationError:
            continue  # a single bad entry doesn't corrupt the rest

    # A non-empty raw response that produced zero valid items after
    # validation is a sign the provider's output shape drifted — treat it
    # as a hard failure rather than silently reporting "no skills found".
    if raw_items and not validated:
        raise SkillExtractionError(
            "AI provider returned data, but none of it matched the expected skill shape."
        )

    return validated
