from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException, status
from supabase import Client

from app.config import get_settings
from app.deps.supabase_clients import get_scoped_client


@dataclass
class CurrentUser:
    """Any authenticated profile, regardless of role. Role-specific
    dependencies below (get_current_student, get_current_institution,
    get_current_industry) are thin wrappers around this."""
    id: str
    email: str | None
    role: str
    client: Client


@dataclass
class CurrentStudent:
    student_id: str
    email: str | None
    client: Client


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> CurrentUser:
    # ---------------------------------------------------------
    # 1. Validate Authorization header
    # ---------------------------------------------------------
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token.",
        )

    settings = get_settings()

    # ---------------------------------------------------------
    # 2. Verify the access token directly with Supabase Auth
    # ---------------------------------------------------------
    # Was httpx.get() (sync/blocking) called from inside an `async def`
    # dependency -- that blocks the single event loop for the full round
    # trip on every request, serializing all concurrent traffic behind
    # Supabase's auth latency. Switched to httpx.AsyncClient so the
    # await actually yields the loop while waiting on the network.
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.RequestError as exc:
        print("SUPABASE AUTH NETWORK ERROR:", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication service is temporarily unreachable.",
        ) from exc

    if response.status_code != 200:
        print(
            "SUPABASE AUTH REJECTED:",
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase session.",
        )

    try:
        user_data = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase returned an invalid authentication response.",
        ) from exc

    user_id = user_data.get("id")
    email = user_data.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase did not return a valid user.",
        )

    # ---------------------------------------------------------
    # 3. Create the RLS-scoped client using the user's JWT
    # ---------------------------------------------------------
    try:
        client = get_scoped_client(token)
    except Exception as exc:
        print("SCOPED CLIENT ERROR:", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not initialize the database connection.",
        ) from exc

    # ---------------------------------------------------------
    # 4. Load the user's profile (role-agnostic)
    # ---------------------------------------------------------
    try:
        profile_res = (
            client.table("profiles")
            .select("id, role, email")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        print("PROFILE DATABASE ERROR:", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach the profile database.",
        ) from exc

    profile = profile_res.data

    # ---------------------------------------------------------
    # 5. Validate a profile exists (no role check here — that's the
    #    job of get_current_student / get_current_institution / etc.)
    # ---------------------------------------------------------
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No profile found for this account.",
        )

    # ---------------------------------------------------------
    # 6. Return the authenticated user, whatever their role
    # ---------------------------------------------------------
    return CurrentUser(
        id=profile["id"],
        email=profile.get("email") or email,
        role=profile.get("role") or "student",
        client=client,
    )


async def get_current_student(
    current: CurrentUser = Depends(get_current_user),
) -> CurrentStudent:
    """Unchanged public behavior from before this refactor: 401 on bad/
    missing token (via get_current_user), 403 if the profile isn't a
    student. Existing callers (app/api/student_ai.py) and existing tests
    (which override this exact function in app.dependency_overrides)
    need no changes."""
    if current.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available to student accounts.",
        )
    return CurrentStudent(
        student_id=current.id,
        email=current.email,
        client=current.client,
    )


def require_role(role: str):
    """Factory for role-specific dependencies. Added now so Stage 3/4 can
    import get_current_institution / get_current_industry without another
    edit to this file. Not wired to any route yet — Stage 1 only
    establishes the foundation; no institution/industry API routes exist."""

    async def _dependency(current: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint is only available to {role} accounts.",
            )
        return current

    return _dependency


get_current_institution = require_role("institution")
get_current_industry = require_role("industry")
