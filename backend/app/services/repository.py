"""
Thin data-access layer over Supabase. Every query here maps directly to a
table/join named in the approved schema — nothing here invents new tables.

Reads use the caller's RLS-scoped client (student can only see their own
rows, or public reference data like open postings). Writes to
`recommendations` / `skill_gaps` use the service-role client, passed in
explicitly by the caller (never constructed inside this module from
untrusted input).
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from uuid import uuid4

from supabase import Client

from app.services.matching_engine import MatchResult, RequiredSkill, gap_priority


def _execute_with_retry(query, max_retries: int = 3):
    """Executes a Supabase query builder with retries on transient connection drops."""
    last_exc = None
    for attempt in range(max_retries):
        try:
            return query.execute()
        except Exception as exc:
            last_exc = exc
            if attempt < max_retries - 1:
                time.sleep(0.3 * (attempt + 1))
    raise last_exc


# ---------- Reads ----------

def fetch_student_row(client: Client, student_id: str) -> dict | None:
    res = _execute_with_retry(
        client.table("students")
        .select("id, resume_url, linkedin_url, github_url, portfolio_url, bio, domain_id, is_placed")
        .eq("id", student_id)
        .single()
    )
    return res.data

def update_student_profile(
    service_client: Client,
    student_id: str,
    *,
    bio: str | None,
    linkedin_url: str | None,
    github_url: str | None,
    portfolio_url: str | None,
) -> dict:
    payload = {
        "bio": bio,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "portfolio_url": portfolio_url,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    res = (
        service_client.table("students")
        .update(payload)
        .eq("id", student_id)
        .execute()
    )

    rows = res.data or []
    if not rows:
        raise ValueError("Student profile could not be updated.")

    return rows[0]



def fetch_student_skills(client: Client, student_id: str) -> list[dict]:
    """Returns rows joined with skill name + category, e.g.
    [{skill_id, skill_name, category_name, proficiency_score, is_verified, source, evidence_url, source_confidence}, ...]
    """
    res = _execute_with_retry(
        client.table("student_skills")
        .select(
            "skill_id, proficiency, proficiency_score, is_verified, source, evidence_url, source_confidence, "
            "skills(name, skill_categories(name))"
        )
        .eq("student_id", student_id)
    )
    rows = []
    for r in res.data or []:
        skill = r.get("skills") or {}
        category = (skill.get("skill_categories") or {}).get("name") if skill else None
        rows.append({
            "skill_id": r["skill_id"],
            "skill_name": skill.get("name", "Unknown"),
            "category_name": category or "Uncategorized",
            "proficiency_score": float(r.get("proficiency_score") or 0),
            "proficiency": r.get("proficiency"),
            "is_verified": bool(r.get("is_verified")),
            "source": r.get("source"),
            "evidence_url": r.get("evidence_url"),
            "source_confidence": r.get("source_confidence"),
        })
    return rows


def student_skill_levels(rows: list[dict]) -> dict[str, float]:
    """Collapse fetch_student_skills() rows into {skill_id: proficiency_score}."""
    return {r["skill_id"]: r["proficiency_score"] for r in rows}


def fetch_academic_records(client: Client, student_id: str) -> dict | None:
    res = (
        client.table("academic_records")
        .select("semester, cgpa_till_date, backlogs, attendance_percentage, academic_year")
        .eq("student_id", student_id)
        .order("semester", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def fetch_certifications_count(client: Client, student_id: str) -> int:
    res = (
        client.table("certifications")
        .select("id", count="exact")
        .eq("student_id", student_id)
        .execute()
    )
    return res.count or 0


def fetch_certification_titles(client: Client, student_id: str) -> list[str]:
    res = (
        client.table("certifications")
        .select("title")
        .eq("student_id", student_id)
        .execute()
    )
    return [row["title"] for row in (res.data or []) if row.get("title")]


def fetch_domain_name(client: Client, domain_id: str | None) -> str | None:
    if not domain_id:
        return None
    res = client.table("domains").select("name").eq("id", domain_id).maybe_single().execute()
    return (res.data or {}).get("name") if res else None


def fetch_open_postings(client: Client, domain_id: str | None = None, posting_type: str | None = None) -> list[dict]:
    q = (
        client.table("postings")
        .select("id, title, company_id, domain_id, type, status, companies(name)")
        .eq("status", "open")
    )
    if domain_id:
        q = q.eq("domain_id", domain_id)
    if posting_type:
        q = q.eq("type", posting_type)
    res = q.execute()
    return res.data or []


def fetch_posting(client: Client, posting_id: str) -> dict | None:
    res = (
        client.table("postings")
        .select("id, title, company_id, status, companies(name)")
        .eq("id", posting_id)
        .single()
        .execute()
    )
    return res.data


def fetch_posting_required_skills(client: Client, posting_id: str) -> list[RequiredSkill]:
    res = (
        client.table("posting_required_skills")
        .select("skill_id, required_level, importance, skills(name)")
        .eq("posting_id", posting_id)
        .execute()
    )
    out = []
    for r in res.data or []:
        skill = r.get("skills") or {}
        out.append(RequiredSkill(
            skill_id=r["skill_id"],
            skill_name=skill.get("name", "Unknown"),
            required_level=float(r.get("required_level") or 0),
            importance=r.get("importance") or "medium",
        ))
    return out


def fetch_cached_recommendations(client: Client, student_id: str, limit: int = 10) -> list[dict]:
    res = (
        client.table("recommendations")
        .select("posting_id, match_score, matched_skills, missing_skills, reason, postings(title, companies(name))")
        .eq("student_id", student_id)
        .order("match_score", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def fetch_cached_skill_gaps(client: Client, student_id: str, target_role: str | None = None) -> list[dict]:
    q = client.table("skill_gaps").select(
        "target_role, skill_id, current_level, required_level, gap, priority, skills(name)"
    ).eq("student_id", student_id)
    if target_role:
        q = q.eq("target_role", target_role)
    res = q.order("gap", desc=True).execute()
    return res.data or []


# ---------- Writes (service-role client only) ----------

def upsert_recommendation(service_client: Client, student_id: str, posting_id: str, result: MatchResult) -> None:
    service_client.table("recommendations").upsert(
        {
            "student_id": student_id,
            "posting_id": posting_id,
            "match_score": result.match_score,
            "matched_skills": result.matched_skills,
            "missing_skills": result.missing_skills,
            "reason": result.reason,
        },
        on_conflict="student_id,posting_id",
    ).execute()


def upsert_skill_gaps(service_client: Client, student_id: str, target_role: str, result: MatchResult) -> None:
    """
    target_role: per the approved decision, this is set to the posting_id
    (as a stable string key) when gap analysis is run against an explicit
    posting rather than a free-text role name — no fuzzy role matching.
    `gap` itself is a generated column in Postgres, so we only write
    current_level/required_level/priority and let the DB derive gap.
    """
    rows = []
    for detail in result.breakdown:
        rows.append({
            "student_id": student_id,
            "target_role": target_role,
            "skill_id": detail.skill_id,
            "current_level": detail.current_level,
            "required_level": detail.required_level,
            "priority": gap_priority(max(detail.required_level - detail.current_level, 0.0)),
        })
    if rows:
        service_client.table("skill_gaps").upsert(
            rows, on_conflict="student_id,target_role,skill_id"
        ).execute()


# ---------- Resumes (Phase 1) ----------
#
# The production schema does not have a separate `resumes` table. Resume
# metadata/text is stored in resume_processing_jobs and the student's
# students.resume_url points to the private Storage path.

def fetch_latest_resume(client: Client, student_id: str) -> dict | None:
    res = (
        client.table("resume_processing_jobs")
        .select(
            "resume_id, student_id, storage_path, file_name, file_type, file_size, "
            "status, error_message, extracted_text, created_at, updated_at"
        )
        .eq("student_id", student_id)
        .not_.is_("storage_path", "null")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return None
    row = rows[0]
    row["id"] = row.get("resume_id")
    row["extraction_status"] = (
        "extracted" if row.get("extracted_text") else
        "failed" if row.get("status") == "failed" else
        "uploaded"
    )
    row["extraction_error"] = row.get("error_message")
    return row


def fetch_resume_for_student(client: Client, student_id: str, resume_id: str) -> dict | None:
    res = (
        client.table("resume_processing_jobs")
        .select(
            "resume_id, student_id, storage_path, file_name, file_type, file_size, "
            "status, error_message, extracted_text, created_at, updated_at"
        )
        .eq("student_id", student_id)
        .eq("resume_id", resume_id)
        .maybe_single()
        .execute()
    )
    row = res.data if res else None
    if not row:
        return None
    row["id"] = row.get("resume_id")
    row["extraction_status"] = (
        "extracted" if row.get("extracted_text") else
        "failed" if row.get("status") == "failed" else
        "uploaded"
    )
    row["extraction_error"] = row.get("error_message")
    return row


def insert_resume_record(
    service_client: Client,
    student_id: str,
    storage_path: str,
    file_name: str,
    file_type: str,
    file_size: int,
) -> dict:
    resume_id = str(uuid4())
    res = _execute_with_retry(
        service_client.table("resume_processing_jobs")
        .insert(
            {
                "resume_id": resume_id,
                "student_id": student_id,
                "status": "pending",
                "storage_path": storage_path,
                "file_name": file_name,
                "file_type": file_type,
                "file_size": file_size,
            }
        )
    )
    rows = res.data or []
    return rows[0] if rows else {"resume_id": resume_id, "id": resume_id}


def update_resume_extraction(
    service_client: Client,
    resume_id: str,
    *,
    status: str,
    extracted_text: str | None = None,
    error: str | None = None,
) -> None:
    persisted_status = "failed" if status == "failed" else "pending"
    payload: dict = {
        "status": persisted_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if extracted_text is not None:
        payload["extracted_text"] = extracted_text
    if error is not None:
        payload["error_message"] = error
    if status == "extracted":
        payload["error_message"] = None

    service_client.table("resume_processing_jobs").update(payload).eq(
        "resume_id", resume_id
    ).execute()


def update_student_resume_url(service_client: Client, student_id: str, storage_path: str) -> None:
    """Store the private Storage path, not a public URL."""
    service_client.table("students").update({"resume_url": storage_path}).eq(
        "id", student_id
    ).execute()


def upload_resume_file(
    service_client: Client,
    bucket: str,
    storage_path: str,
    file_bytes: bytes,
    content_type: str,
) -> None:
    service_client.storage.from_(bucket).upload(
        storage_path,
        file_bytes,
        {"content-type": content_type, "upsert": "true"},
    )


def create_resume_signed_url(
    service_client: Client,
    bucket: str,
    storage_path: str,
    expires_in: int,
) -> str | None:
    try:
        res = service_client.storage.from_(bucket).create_signed_url(storage_path, expires_in)
    except Exception:
        return None
    if isinstance(res, dict):
        return res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
    return None


# ---------- AI skill extraction / normalization (Phase 2) ----------
#
# Reads use the caller's RLS-scoped client, same pattern as everywhere
# else in this module. All writes (extracted_skill_candidates,
# student_skills upserts from AI, student_embeddings) use the
# service-role client, passed in explicitly by the caller.

def fetch_all_skills(client: Client) -> list[dict]:
    """Canonical skills catalog: [{"id": ..., "name": ...}]. Public
    reference data, readable by any authenticated user."""
    res = client.table("skills").select("id, name").execute()
    return res.data or []


def fetch_skill_aliases(client: Client) -> dict[str, str]:
    """Returns {normalized_alias: skill_id}. Caller is responsible for
    normalizing the alias text consistently (see
    skill_normalization_service.normalize_text) — this just hands back
    the raw alias/skill_id pairs from the table."""
    try:
        res = client.table("skill_aliases").select("alias, skill_id").execute()
        return {row["alias"]: row["skill_id"] for row in (res.data or [])}
    except Exception:
        return {}


def fetch_student_skill(client: Client, student_id: str, skill_id: str) -> dict | None:
    res = (
        client.table("student_skills")
        .select("student_id, skill_id, proficiency, proficiency_score, is_verified, source")
        .eq("student_id", student_id)
        .eq("skill_id", skill_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


def upsert_student_skill_ai(
    service_client: Client,
    student_id: str,
    skill_id: str,
    proficiency_score: float,
    proficiency_label: str,
) -> None:
    """Upsert on the (student_id, skill_id) primary key — safe to call
    repeatedly, never creates duplicates. Callers (skill_normalization_service)
    are responsible for having already decided the final proficiency_score
    (e.g. max(existing, ai_default)) and for never calling this at all when
    the existing row is is_verified=True."""
    service_client.table("student_skills").upsert(
        {
            "student_id": student_id,
            "skill_id": skill_id,
            "proficiency": proficiency_label,
            "proficiency_score": proficiency_score,
            "is_verified": False,
            "source": "ai_estimated",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="student_id,skill_id",
    ).execute()


def upsert_verified_student_skill(
    service_client: Client,
    student_id: str,
    skill_id: str,
    proficiency_score: float = 95.0,
    proficiency_label: str = "advanced",
    evidence_url: str | None = None,
) -> None:
    """Upserts or upgrades a student skill to verified status backed by document proof."""
    valid_levels = {"beginner", "intermediate", "advanced", "expert"}
    label = proficiency_label.lower() if proficiency_label else "advanced"
    if label not in valid_levels:
        label = "advanced" if proficiency_score >= 70.0 else "intermediate"

    payload = {
        "student_id": student_id,
        "skill_id": skill_id,
        "proficiency": label,
        "proficiency_score": proficiency_score,
        "is_verified": True,
        "source": "document_verified",
        "evidence_url": evidence_url,
        "source_confidence": 0.95,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _execute_with_retry(
        service_client.table("student_skills").upsert(
            payload,
            on_conflict="student_id,skill_id",
        )
    )


def insert_certification(
    service_client: Client,
    student_id: str,
    title: str,
    issuing_organization: str = "Supporting Document",
    credential_url: str | None = None,
    is_verified: bool = True,
) -> dict:
    cert_id = str(uuid4())
    payload = {
        "id": cert_id,
        "student_id": student_id,
        "title": title,
        "issuing_organization": issuing_organization,
        "is_verified": is_verified,
    }
    if credential_url:
        payload["credential_url"] = credential_url

    res = _execute_with_retry(
        service_client.table("certifications").insert(payload)
    )
    rows = res.data or []
    return rows[0] if rows else {"id": cert_id, "title": title}


def fetch_student_certifications(client: Client, student_id: str) -> list[dict]:
    res = _execute_with_retry(
        client.table("certifications")
        .select("id, title, issuing_organization, credential_url, is_verified, created_at")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
    )
    return res.data or []


def insert_skill_candidate(service_client: Client, row: dict) -> None:
    # The production schema does not contain an extracted_skill_candidates
    # table. Matched skills are persisted in student_skills; unmatched skills
    # remain in the in-memory pipeline result and are not written to a
    # non-existent table.
    return None


def fetch_skill_candidates(client: Client, student_id: str, resume_id: str | None = None) -> list[dict]:
    return []


def fetch_resume_processing_job(client: Client, student_id: str, resume_id: str) -> dict | None:
    res = (
        client.table("resume_processing_jobs")
        .select(
            "resume_id, student_id, status, error_message, provider, model, "
            "started_at, completed_at, updated_at"
        )
        .eq("student_id", student_id)
        .eq("resume_id", resume_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


def upsert_resume_processing_job(
    service_client: Client,
    *,
    resume_id: str,
    student_id: str,
    status: str,
    error: str | None = None,
    provider: str | None = None,
    model: str | None = None,
    started_at: str | None = None,
    completed_at: str | None = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "resume_id": resume_id,
        "student_id": student_id,
        "status": status,
        "error_message": error,
        "updated_at": now,
    }
    if provider is not None:
        payload["provider"] = provider
    if model is not None:
        payload["model"] = model
    if started_at is not None:
        payload["started_at"] = started_at
    if completed_at is not None:
        payload["completed_at"] = completed_at

    existing = (
        service_client.table("resume_processing_jobs")
        .select("id")
        .eq("student_id", student_id)
        .eq("resume_id", resume_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        service_client.table("resume_processing_jobs").update(payload).eq(
            "id", existing.data[0]["id"]
        ).execute()
    else:
        service_client.table("resume_processing_jobs").insert(payload).execute()


def fetch_student_embedding(client: Client, student_id: str) -> dict | None:
    res = (
        client.table("student_embeddings")
        .select("id, embedding_model, content_hash, source_version, updated_at")
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


def upsert_student_embedding(
    service_client: Client,
    student_id: str,
    embedding: list[float],
    embedding_model: str,
    content_hash: str,
    source_version: str | None,
) -> None:
    """Upsert on the unique student_id column — one current embedding per
    student. Safe to call repeatedly; embedding_service only calls this
    when the content_hash has actually changed."""
    service_client.table("student_embeddings").upsert(
        {
            "student_id": student_id,
            "embedding": embedding,
            "embedding_model": embedding_model,
            "content_hash": content_hash,
            "source_version": source_version,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="student_id",
    ).execute()
