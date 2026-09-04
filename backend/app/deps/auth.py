from dataclasses import dataclass

import httpx
from fastapi import Header, HTTPException, status
from supabase import Client

from app.config import get_settings
from app.deps.supabase_clients import get_scoped_client


@dataclass
class CurrentStudent:
    student_id: str
    email: str | None
    client: Client


_auth_http_client = httpx.Client(transport=httpx.HTTPTransport(retries=5), timeout=15.0)


async def get_current_student(
    authorization: str | None = Header(default=None),
) -> CurrentStudent:
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
    # 2. Verify the access token directly with Supabase Auth (with retries)
    # ---------------------------------------------------------
    response = None
    last_auth_exc = None
    for attempt in range(3):
        try:
            response = _auth_http_client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
            break
        except httpx.RequestError as exc:
            last_auth_exc = exc
            if attempt < 2:
                import time
                time.sleep(0.3 * (attempt + 1))
            continue

    if response is None:
        print("SUPABASE AUTH NETWORK ERROR (after retries):", repr(last_auth_exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication service is temporarily unreachable.",
        ) from last_auth_exc

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
    # 4. Load the user's profile (with retries for network resilience)
    # ---------------------------------------------------------
    profile_res = None
    last_profile_exc = None
    for attempt in range(3):
        try:
            profile_res = (
                client.table("profiles")
                .select("id, role, email")
                .eq("id", user_id)
                .single()
                .execute()
            )
            break
        except Exception as exc:
            last_profile_exc = exc
            if attempt < 2:
                import time
                time.sleep(0.3 * (attempt + 1))
            continue

    if profile_res is None:
        print("PROFILE DATABASE ERROR (after retries):", repr(last_profile_exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach the student profile database.",
        ) from last_profile_exc

    profile = profile_res.data

    # ---------------------------------------------------------
    # 5. Validate student profile
    # ---------------------------------------------------------
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No profile found for this account.",
        )

    if profile.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available to student accounts.",
        )

    # ---------------------------------------------------------
    # 6. Return authenticated student
    # ---------------------------------------------------------
    return CurrentStudent(
        student_id=profile["id"],
        email=profile.get("email") or email,
        client=client,
    )
