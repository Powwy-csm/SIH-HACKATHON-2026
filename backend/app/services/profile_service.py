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
    # 1. ONE network call to rule them all (Zero latency bottleneck)
    data = repo.fetch_comprehensive_student_data(client, student_id)
    
    # Fallback for certifications count (keeping this separate as counting inside a join is tricky)
    cert_count = repo.fetch_certifications_count(client, student_id) or 0

    if not data:
        # Return empty state if student isn't found
        return {"profile_completeness": 0, "trust_score": 0.0, "skills": [], "projects": []}

    # 2. Extract nested data arrays
    skill_rows = data.get("student_skills") or []
    projects = data.get("student_projects") or []
    
    # Supabase one-to-many joins return lists, so we grab the first academic record
    academic_list = data.get("academic_records") or []
    academic = academic_list[0] if academic_list else {}

    # Supabase many-to-one joins (lookups) return dictionaries
    domain_data = data.get("domains") or {}
    subdomain_data = data.get("subdomains") or {}
    interest_data = data.get("fields_of_interest") or {}

    domain_name = domain_data.get("name") if isinstance(domain_data, dict) else None
    subdomain_name = subdomain_data.get("name") if isinstance(subdomain_data, dict) else None
    interest_name = interest_data.get("name") if isinstance(interest_data, dict) else None

    # 3. Calculate Completeness
    completeness = 0
    for field, weight in _COMPLETENESS_FIELDS.items():
        if data.get(field):
            completeness += weight
    if academic:
        completeness += _HAS_ACADEMIC_RECORD_WEIGHT
    if cert_count > 0:
        completeness += _HAS_CERTIFICATION_WEIGHT
    completeness = min(completeness, 100)

    # 4. Calculate Trust Scores & Categories
    verified = [r for r in skill_rows if r.get("is_verified")]

    if skill_rows:
        trust_raw = sum(_SOURCE_TRUST_WEIGHTS.get(r.get("source"), 0.3) for r in skill_rows) / len(skill_rows)
        trust_score = round(trust_raw * 100, 2)
    else:
        trust_score = 0.0

    by_category: dict[str, list[str]] = defaultdict(list)
    for r in skill_rows:
        by_category[r.get("category_name", "Unknown")].append(r.get("skill_name", "Unknown"))

    # 5. Return Formatted Dictionary
    return {
        "profile_completeness": completeness,
        "trust_score": trust_score,
        "bio": data.get("bio"),
        "domain": domain_name,
        "domain_id": data.get("domain_id"),
        "subdomain": subdomain_name,
        "subdomain_id": data.get("subdomain_id"),
        "interest": interest_name,
        "interest_id": data.get("interest_id"),
        "skills": [
            {
                "skill_id": r.get("skill_id"),
                "skill_name": r.get("skill_name"),
                "category_name": r.get("category_name"),
                "proficiency": r.get("proficiency"),
                "proficiency_score": r.get("proficiency_score"),
                "is_verified": r.get("is_verified"),
                "source": r.get("source"),
                "evidence_url": r.get("evidence_url"),
            }
            for r in skill_rows
        ],
        "verified_skills": [
            {"skill_id": r.get("skill_id"), "skill": r.get("skill_name"), "proficiency": r.get("proficiency")}
            for r in verified
        ],
        "skills_by_category": dict(by_category),
        "projects": projects,
        "academic_record": {
            "semester": academic.get("semester"),
            "cgpa_till_date": academic.get("cgpa_till_date"),
            "backlogs": academic.get("backlogs"),
            "attendance_percentage": academic.get("attendance_percentage"),
        } if academic else None,
        "certifications_count": cert_count,
    }