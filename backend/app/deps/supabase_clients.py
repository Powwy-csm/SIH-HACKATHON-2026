"""
Two-client model (Phase 2), per the approved architecture:

1. `get_scoped_client(jwt)` — built with the ANON key, then the caller's own
   JWT is attached to outgoing PostgREST requests via `.auth(token)`. Every
   read through this client is subject to Supabase RLS, so a student can only
   ever see rows they're entitled to (their own `students`/`student_skills`
   row, read-only `recommendations`/`skill_gaps`, etc). We do NOT re-implement
   ownership checks in Python — RLS is the source of truth.

2. `get_service_client()` — built with the SERVICE ROLE key. This bypasses
   RLS entirely and is used ONLY for the narrow set of writes the schema
   requires (upserts into `recommendations` and `skill_gaps`), never for
   reads of arbitrary data, and never constructed from anything the frontend
   sends. This client is a module-level singleton so the service-role key is
   read from env once, not passed around as a parameter that could leak into
   logs.
"""
import httpx
from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


def _configure_resilient_transports(client: Client) -> Client:
    """Equips client PostgREST and Storage HTTP sessions with automatic TCP retries to prevent connection resets."""
    try:
        transport = httpx.HTTPTransport(retries=5)
        if hasattr(client, "postgrest") and hasattr(client.postgrest, "session"):
            client.postgrest.session._transport = transport
        if hasattr(client, "storage"):
            if hasattr(client.storage, "_client"):
                client.storage._client._transport = transport
            if hasattr(client.storage, "session"):
                client.storage.session._transport = transport
    except Exception:
        pass
    return client


def get_scoped_client(user_jwt: str) -> Client:
    """Client that enforces RLS as the calling student."""
    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_ANON_KEY are not configured in the environment."
        )
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    _configure_resilient_transports(client)
    # Attaches the user's JWT to PostgREST + Auth requests made by this client
    # instance, so row-level security evaluates auth.uid() as this student.
    client.postgrest.auth(user_jwt)
    return client


@lru_cache
def get_service_client() -> Client:
    """
    Trusted server-side client that bypasses RLS. Singleton + cached so the
    service-role key is loaded once from env and reused, never rebuilt per
    request from request-derived input.
    """
    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured in the environment."
        )
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    _configure_resilient_transports(client)
    return client
