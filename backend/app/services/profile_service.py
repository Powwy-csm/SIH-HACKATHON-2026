from __future__ import annotations

import concurrent.futures
import time
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
    t_total = time.time()

    # Parallelize student data fetch and certifications count
    def _fetch_student_data():
        t0 = time.time()
        try:
            res = repo.fetch_comprehensive_student_data(client, student_id)
            print(f"[PERF] fetch_comprehensive_student_data: {time.time() - t0:.3f}s")
            return res
        except Exception as exc:
            print(f"[ERROR] fetch_comprehensive_student_data failed: {exc}")
            return {}

    def _fetch_certs():
        t1 = time.time()
        try:
            res = repo.fetch_certifications_count(client, student_id) or 0
            print(f"[PERF] fetch_certifications_count: {time.time() - t1:.3f}s")
            return res
        except Exception as exc:
            print(f"[ERROR] fetch_certifications_count failed: {exc}")
            return 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f_data = executor.submit(_fetch_student_data)
        f_certs = executor.submit(_fetch_certs)
        data = f_data.result()
        cert_count = f_certs.result()

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

    def _get_skill_name(r):
        return r.get("skill_name") or (r.get("skills") or {}).get("name") or r.get("raw_skill_name") or r.get("skill") or r.get("name") or "Skill"

    def _get_category_name(r):
        return r.get("category_name") or ((r.get("skills") or {}).get("skill_categories") or {}).get("name") or "General"

    by_category: dict[str, list[str]] = defaultdict(list)
    for r in skill_rows:
        by_category[_get_category_name(r)].append(_get_skill_name(r))

    # 5. Return Formatted Dictionary
    result = {
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
                "skill_name": _get_skill_name(r),
                "category_name": _get_category_name(r),
                "proficiency": r.get("proficiency"),
                "proficiency_score": r.get("proficiency_score"),
                "is_verified": r.get("is_verified"),
                "source": r.get("source"),
                "evidence_url": r.get("evidence_url"),
            }
            for r in skill_rows
        ],
        "verified_skills": [
            {"skill_id": r.get("skill_id"), "skill": _get_skill_name(r), "proficiency": r.get("proficiency")}
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
    print(f"[PERF] analyze_profile TOTAL: {time.time() - t_total:.3f}s")
    return result