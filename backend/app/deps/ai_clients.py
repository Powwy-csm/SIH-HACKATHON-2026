from __future__ import annotations

import json
import logging
import time
from abc import ABC, abstractmethod

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    """Raised for any AI-provider failure."""


class AIProvider(ABC):
    """Interface every AI provider implementation must satisfy."""

    name: str

    @abstractmethod
    def extract_skills(self, resume_text: str) -> list[dict]:
        """Extract professional skills from resume text."""

    @abstractmethod
    def generate_embedding(self, text: str) -> list[float]:
        """Return a single embedding vector."""

    @property
    @abstractmethod
    def skill_extraction_model(self) -> str:
        """Model used for skill extraction."""

    @property
    @abstractmethod
    def embedding_model(self) -> str:
        """Model used for embeddings."""


_SKILL_EXTRACTION_SYSTEM_PROMPT = """You extract hiring-relevant skills from resume text.

Return ONLY a JSON array (no prose, no markdown fences) of objects shaped exactly like:
[{"skill_name": "Python", "confidence": 0.95}]

Rules:
- Extract genuine technical, professional, software, tool, platform, methodology,
  framework, industry, and domain skills that a hiring manager could use for matching.
- Include programming languages, databases, cloud platforms, libraries/frameworks,
  developer tools, analytics/BI tools, design tools, business/domain systems,
  engineering methods, and relevant professional competencies.
- Do NOT extract generic soft traits such as "hardworking", "team player", or "good communication".
- Do NOT extract every capitalized word, employer name, degree, job title, or generic noun.
- Prefer the canonical/common skill name when the text clearly supports one.
- confidence is your estimate in [0, 1] of how clearly this skill is stated or demonstrated.
- If no relevant skills are present, return an empty array: []
- Return at most 40 skills, ordered by relevance/confidence.
"""


class GeminiProvider(AIProvider):
    """Google Gemini implementation using the Generative Language REST API."""

    name = "gemini"

    def __init__(
        self,
        api_key: str,
        skill_model: str,
        embed_model: str,
        embedding_dimensions: int,
    ):
        if not api_key:
            raise AIProviderError(
                "GEMINI_API_KEY is not configured. Set it in the backend environment."
            )

        self._api_key = api_key
        self._skill_model = skill_model
        self._embed_model = embed_model
        self._embedding_dimensions = embedding_dimensions
        self._base_url = "https://generativelanguage.googleapis.com/v1beta"

    @property
    def skill_extraction_model(self) -> str:
        return self._skill_model

    @property
    def embedding_model(self) -> str:
        return self._embed_model

    def extract_skills(self, resume_text: str) -> list[dict]:
        payload = {
            "systemInstruction": {
                "parts": [
                    {
                        "text": _SKILL_EXTRACTION_SYSTEM_PROMPT
                    }
                ]
            },
            "contents": [
                {
                    "parts": [
                        {
                            "text": resume_text
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            },
        }

        models_to_try = [self._skill_model]
        for fallback in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        raw_text = None
        last_exc = None
        for model in models_to_try:
            url = f"{self._base_url}/models/{model}:generateContent"
            try:
                raw_text = self._post(url, payload, timeout=45.0)
                self._skill_model = model
                break
            except AIProviderError as exc:
                last_exc = exc
                logger.warning("Skill extraction on model %s failed: %s. Attempting fallback model...", model, exc)
                continue

        if raw_text is None:
            raise last_exc or AIProviderError("All AI models failed during skill extraction.")

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise AIProviderError(
                "The AI provider returned a response that was not valid JSON."
            ) from exc

        if not isinstance(parsed, list):
            raise AIProviderError(
                "The AI provider's skill extraction response was not a JSON array."
            )

        skills = []

        for item in parsed:
            if not isinstance(item, dict):
                raise AIProviderError(
                    "The AI provider returned an invalid skill object."
                )

            skill_name = item.get("skill_name")
            confidence = item.get("confidence")

            if not isinstance(skill_name, str):
                raise AIProviderError(
                    "The AI provider returned a skill without a valid skill_name."
                )

            if not isinstance(confidence, (int, float)):
                raise AIProviderError(
                    "The AI provider returned a skill without a valid confidence."
                )

            if not 0 <= confidence <= 1:
                raise AIProviderError(
                    "The AI provider returned a confidence value outside [0, 1]."
                )

            skills.append(
                {
                    "skill_name": skill_name,
                    "confidence": float(confidence),
                }
            )

        return skills[:40]

    def generate_embedding(self, text: str) -> list[float]:
        url = f"{self._base_url}/models/{self._embed_model}:embedContent"

        payload = {
            "model": f"models/{self._embed_model}",
            "content": {
                "parts": [
                    {
                        "text": text
                    }
                ]
            },
            "outputDimensionality": self._embedding_dimensions,
        }

        try:
            response = httpx.post(
                url,
                params={"key": self._api_key},
                json=payload,
                timeout=60.0,
            )
        except httpx.RequestError as exc:
            raise AIProviderError(
                f"Could not reach the AI provider: {exc}"
            ) from exc

        if response.status_code != 200:
            raise AIProviderError(
                f"AI provider returned {response.status_code}: "
                f"{response.text[:500]}"
            )

        try:
            data = response.json()
            values = data["embedding"]["values"]
        except (ValueError, KeyError, TypeError) as exc:
            raise AIProviderError(
                "AI provider returned an invalid embedding response."
            ) from exc

        if not values:
            raise AIProviderError(
                "AI provider returned an empty embedding."
            )

        if len(values) != self._embedding_dimensions:
            raise AIProviderError(
                f"Expected embedding dimension "
                f"{self._embedding_dimensions}, "
                f"got {len(values)}."
            )

        return [float(value) for value in values]

    def _post(
        self,
        url: str,
        payload: dict,
        timeout: float,
    ) -> str:
        last_response = None
        for attempt in range(2):
            try:
                response = httpx.post(
                    url,
                    params={"key": self._api_key},
                    json=payload,
                    timeout=timeout,
                )
                last_response = response
                if response.status_code == 200:
                    break
                if response.status_code in (503, 429) and attempt == 0:
                    time.sleep(1.5)
                    continue
            except httpx.RequestError as exc:
                if attempt == 0:
                    time.sleep(1.0)
                    continue
                raise AIProviderError(
                    f"Could not reach the AI provider: {exc}"
                ) from exc

        if not last_response or last_response.status_code != 200:
            status_code = last_response.status_code if last_response else "unknown"
            text = last_response.text[:300] if last_response else "No response"
            raise AIProviderError(
                f"AI provider returned {status_code}: {text}"
            )

        try:
            data = last_response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(
                "AI provider's response was missing the expected content shape."
            ) from exc


def get_ai_provider() -> AIProvider:
    """Factory for the configured AI provider."""

    settings = get_settings()
    provider_name = (settings.AI_PROVIDER or "gemini").lower()

    if provider_name == "gemini":
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            skill_model=settings.GEMINI_SKILL_EXTRACTION_MODEL,
            embed_model=settings.GEMINI_EMBEDDING_MODEL,
            embedding_dimensions=settings.EMBEDDING_DIMENSIONS,
        )

    raise AIProviderError(
        f"Unknown AI_PROVIDER '{provider_name}'. Supported: gemini."
    )
