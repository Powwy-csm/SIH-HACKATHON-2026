from __future__ import annotations

from collections import defaultdict

from supabase import Client

from app.services import repository as repo

# Weighted profile-completeness fields. Kept as a simple constant table so
# the weighting is easy to review/tune without touching the calculation code.
_COMPLETENESS_FIELDS = {
    "resume_url": 20,
    "bio": 10,
    "linkedin_url": 10,
    "github_url": 10,
    "portfolio_url": 10,
}
_HAS_ACADEMIC_RECORD_WEIGHT = 20
_HAS_CERTIFICATION_WEIGHT = 20

_SOURCE_TRUST_WEIGHTS = {
    "institution_verified": 1.0,
    "certificate": 0.85,
    "assessment": 0.7,
    "ai_estimated": 0.4,
    "student_added": 0.2,
}


def analyze_profile(client: Client, student_id: str) -> dict:
    student = repo.fetch_student_row(client, student_id) or {}
    skill_rows = repo.fetch_student_skills(client, student_id)
    academic = repo.fetch_academic_records(client, student_id)
    cert_count = repo.fetch_certifications_count(client, student_id)

    completeness = 0
    for field, weight in _COMPLETENESS_FIELDS.items():
        if student.get(field):
            completeness += weight
    if academic:
        completeness += _HAS_ACADEMIC_RECORD_WEIGHT
    if cert_count > 0:
        completeness += _HAS_CERTIFICATION_WEIGHT
    completeness = min(completeness, 100)

    verified = [r for r in skill_rows if r["is_verified"]]
    unverified = [r for r in skill_rows if not r["is_verified"]]

    if skill_rows:
        trust_raw = sum(_SOURCE_TRUST_WEIGHTS.get(r["source"], 0.3) for r in skill_rows) / len(skill_rows)
        trust_score = round(trust_raw * 100, 2)
    else:
        trust_score = 0.0

    by_category: dict[str, list[str]] = defaultdict(list)
    for r in skill_rows:
        by_category[r["category_name"]].append(r["skill_name"])

    return {
        "profile_completeness": completeness,
        "trust_score": trust_score,
        "verified_skills": [
            {"skill_id": r["skill_id"], "skill": r["skill_name"], "proficiency": r["proficiency"]}
            for r in verified
        ],
        "unverified_skills": [
            {"skill_id": r["skill_id"], "skill": r["skill_name"], "proficiency": r["proficiency"]}
            for r in unverified
        ],
        "skills_by_category": dict(by_category),
        "academic_summary": {
            "cgpa": academic.get("cgpa_till_date") if academic else None,
            "backlogs": academic.get("backlogs") if academic else None,
            "attendance_percentage": academic.get("attendance_percentage") if academic else None,
        },
        "certifications_count": cert_count,
    }
