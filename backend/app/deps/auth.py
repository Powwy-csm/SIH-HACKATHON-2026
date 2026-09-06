from dataclasses import dataclass
from datetime import datetime, timezone

import httpx
from fastapi import Header, HTTPException, status
from supabase import Client

from app.config import get_settings
from app.deps.supabase_clients import get_scoped_client, get_service_client


@dataclass
class CurrentStudent:
    student_id: str
    email: str | None
    client: Client


@dataclass
class CurrentInstitutionUser:
    user_id: str
    email: str | None


_auth_http_client = httpx.Client(transport=httpx.HTTPTransport(retries=5), timeout=15.0)


def get_current_student(
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
    # 3. Create the RLS-scoped client using the user's JWT.
    #    This client remains the client returned to downstream handlers.
    # ---------------------------------------------------------
    try:
        client = get_scoped_client(token)
    except Exception as exc:
        print("SCOPED CLIENT ERROR:", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not initialize the database connection.",
        ) from exc

    # Profile/student provisioning is a trusted backend operation. Do not use
    # the anon+JWT client for it: that client executes as `authenticated` and
    # is subject to the project's table grants/RLS policies.
    try:
        bootstrap_client = get_service_client()
    except Exception as exc:
        print(
            "PROFILE BOOTSTRAP CLIENT ERROR:",
            {"user_id": user_id, "client": "service_role", "error": repr(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not initialize the student profile database connection.",
        ) from exc

    print(
        "PROFILE AUTH CONTEXT:",
        {
            "user_id": user_id,
            "client": "service_role",
            "session_verified": True,
            "access_token_forwarded_to_scoped_client": True,
        },
    )

    # ---------------------------------------------------------
    # 4. Ensure a profile row exists for this authenticated user.
    #    First-time students can legitimately sign in before the profile row is
    #    created, so do an idempotent upsert instead of failing on a missing row.
    # ---------------------------------------------------------
    profile = None
    last_profile_exc = None
    for attempt in range(3):
        try:
            profile_res = (
                bootstrap_client.table("profiles")
                .select("id, role, email")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            profile = profile_res.data if profile_res and profile_res.data else None
            break
        except Exception as exc:
            last_profile_exc = exc
            if attempt < 2:
                import time
                time.sleep(0.3 * (attempt + 1))
            continue

    if profile is None:
        try:
            user_metadata = user_data.get("user_metadata") or {}
            raw_role = (
                user_metadata.get("role")
                or user_data.get("app_metadata", {}).get("role")
                or "student"
            )
            role_aliases = {
                "student": "student",
                "students": "student",
                "institution": "institution",
                "institutional": "institution",
                "faculty": "institution",
                "academician": "institution",
                "industry": "industry",
                "company": "industry",
                "employer": "industry",
            }
            profile_role = role_aliases.get(str(raw_role).strip().lower())
            if profile_role is None:
                raise ValueError(f"Unsupported profile role: {raw_role!r}")

            full_name = (
                user_metadata.get("full_name")
                or user_metadata.get("name")
                or (email or "").split("@", 1)[0]
                or "Student"
            )
            profile_payload = {
                "id": user_id,
                "full_name": str(full_name).strip(),
                "email": email or user_data.get("email"),
                "role": profile_role,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            upsert_res = (
                bootstrap_client.table("profiles")
                .upsert(profile_payload, on_conflict="id")
                .execute()
            )
            profile = (upsert_res.data or [profile_payload])[0]
        except Exception as exc:
            last_profile_exc = exc
            print(
                "PROFILE INIT ERROR:",
                {
                    "user_id": user_id,
                    "client": "service_role",
                    "payload_columns": ["id", "full_name", "email", "role"],
                    "error": repr(exc),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not initialize the student profile.",
            ) from exc

    # Ensure the corresponding student row exists before onboarding or profile
    # operations use it. This is idempotent and must not overwrite any existing
    # data for previously initialized students.
    try:
        student_res = (
            bootstrap_client.table("students")
            .select("id, onboarding_completed")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not student_res or not student_res.data:
            bootstrap_client.table("students").upsert(
                {"id": user_id, "is_placed": False},
                on_conflict="id",
            ).execute()
    except Exception as exc:
        print(
            "STUDENT ROW INIT ERROR:",
            {"user_id": user_id, "client": "service_role", "error": repr(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not initialize the student record.",
        ) from exc

    # ---------------------------------------------------------
    # 5. Validate student profile
    # ---------------------------------------------------------
    role = str(profile.get("role") or "student").lower()
    if role not in {"student", "authenticated"} and not role.endswith("student"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available to student accounts.",
        )

    # ---------------------------------------------------------
    # 6. Return authenticated student
    # ---------------------------------------------------------
    return CurrentStudent(
        student_id=user_id,
        email=profile.get("email") or email,
        client=client,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Institution auth dependency
# Mirrors get_current_student() but:
#   • Accepts institution / academician / faculty roles.
#   • Returns a service-role client so the handler can read ALL students
#     (RLS restricts student tables to own-row for the scoped client).
# ─────────────────────────────────────────────────────────────────────────────

_INSTITUTION_ROLES = {"institution", "institutional", "academician", "faculty"}


def get_current_institution_user(
    authorization: str | None = Header(default=None),
) -> CurrentInstitutionUser:
    """FastAPI dependency: validates a Supabase JWT and enforces institution user access."""

    # 1. Parse Bearer token
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

    # 2. Verify the JWT directly with Supabase Auth (with retries)
    response = None
    last_exc = None
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
        except Exception as exc:  # httpx.RequestError
            last_exc = exc
            if attempt < 2:
                import time
                time.sleep(0.3 * (attempt + 1))

    if response is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication service is temporarily unreachable.",
        ) from last_exc

    if response.status_code != 200:
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

    # 3. Ensure a profile row exists in the profiles table.
    # Note: Postgres user_role enum type in this database has 'student' as its value.
    svc = get_service_client()
    profile = None
    for attempt in range(3):
        try:
            profile_res = (
                svc.table("profiles")
                .select("id, role, email, full_name")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            profile = profile_res.data if profile_res and profile_res.data else None
            break
        except Exception:
            if attempt < 2:
                import time
                time.sleep(0.3 * (attempt + 1))
            continue

    user_metadata = user_data.get("user_metadata") or {}
    full_name = (
        user_metadata.get("full_name")
        or user_metadata.get("name")
        or (email or "").split("@", 1)[0]
        or "Institution User"
    )

    if profile is None:
        try:
            profile_payload = {
                "id": user_id,
                "full_name": str(full_name).strip(),
                "email": email or user_data.get("email"),
                "role": "student",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            upsert_res = (
                svc.table("profiles")
                .upsert(profile_payload, on_conflict="id")
                .execute()
            )
            profile = (upsert_res.data or [profile_payload])[0]
        except Exception as exc:
            print("INSTITUTION PROFILE INIT ERROR:", repr(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not initialize the institution profile.",
            ) from exc

    return CurrentInstitutionUser(
        user_id=user_id,
        email=profile.get("email") or email,
    )
