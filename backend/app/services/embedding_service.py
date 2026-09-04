"""
Phase 2: embedding generation for the student profile document.

content_hash is a plain sha256 of the exact profile document text. If the
stored hash for this student already matches, we skip calling the AI
provider entirely — this is the "generate embedding only if content
changed" step in the Phase 2 pipeline.
"""
from __future__ import annotations

import hashlib

from app.deps.ai_clients import AIProvider, AIProviderError
from app.services import repository as repo


class EmbeddingError(Exception):
    """Raised when embedding generation fails. Callers must catch this
    separately from skill-extraction failures — a failed embedding must
    never roll back or hide already-successful skill extraction."""


def content_hash_of(document: str) -> str:
    return hashlib.sha256(document.encode("utf-8")).hexdigest()


def get_or_create_embedding(
    client,
    service_client,
    student_id: str,
    profile_document: str,
    ai_provider: AIProvider,
    source_version: str | None,
) -> dict:
    """Returns {"generated": bool, "embedding_model": str, "content_hash": str}.
    Raises EmbeddingError on provider failure — callers decide how to
    report that without failing the whole request."""
    new_hash = content_hash_of(profile_document)

    existing = repo.fetch_student_embedding(client, student_id)
    if existing and existing.get("content_hash") == new_hash and existing.get("embedding_model") == ai_provider.embedding_model:
        return {
            "generated": False,
            "embedding_model": existing["embedding_model"],
            "content_hash": new_hash,
        }

    try:
        vector = ai_provider.generate_embedding(profile_document)
    except AIProviderError as exc:
        raise EmbeddingError(f"AI provider failed during embedding generation: {exc}") from exc

    repo.upsert_student_embedding(
        service_client,
        student_id=student_id,
        embedding=vector,
        embedding_model=ai_provider.embedding_model,
        content_hash=new_hash,
        source_version=source_version,
    )

    return {
        "generated": True,
        "embedding_model": ai_provider.embedding_model,
        "content_hash": new_hash,
    }
