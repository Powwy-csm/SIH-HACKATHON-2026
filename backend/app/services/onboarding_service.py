import concurrent.futures
import logging
import time
from datetime import datetime, timezone
from supabase import Client
from app.schemas.onboarding_data import get_self_report_score, calculate_confidence, get_questions_for_interest

logger = logging.getLogger(__name__)

def get_config(client: Client):
    t_total = time.time()

    def _fetch_domains():
        t0 = time.time()
        try:
            res = client.table("domains").select("id, name").execute()
            data = res.data or []
            print(f"[PERF]   get_config (parallel) > domains: {time.time() - t0:.3f}s")
            return data
        except Exception as exc:
            logger.warning(f"Could not fetch domains: {exc}")
            return []

    def _fetch_subdomains():
        t1 = time.time()
        try:
            res = client.table("subdomains").select("id, domain_id, name").execute()
            data = res.data or []
            print(f"[PERF]   get_config (parallel) > subdomains: {time.time() - t1:.3f}s")
            return data
        except Exception as exc:
            logger.warning(f"Could not fetch subdomains (maybe table missing): {exc}")
            return []

    def _fetch_fields():
        t2 = time.time()
        try:
            res = client.table("fields_of_interest").select("id, subdomain_id, name").execute()
            data = res.data or []
            print(f"[PERF]   get_config (parallel) > fields_of_interest: {time.time() - t2:.3f}s")
            return data
        except Exception as exc:
            logger.warning(f"Could not fetch fields of interest: {exc}")
            return []

    def _fetch_cats():
        t3 = time.time()
        try:
            res = client.table("skill_categories").select("id, name").execute()
            data = res.data or []
            print(f"[PERF]   get_config (parallel) > skill_categories: {time.time() - t3:.3f}s")
            return data
        except Exception as exc:
            logger.warning(f"Could not fetch skill categories: {exc}")
            return []

    def _fetch_skills():
        t4 = time.time()
        try:
            res = client.table("skills").select("id, name, domain_id, category").execute()
            data = res.data or []
            print(f"[PERF]   get_config (parallel) > skills: {time.time() - t4:.3f}s")
            return data
        except Exception as exc:
            logger.warning(f"Could not fetch skills: {exc}")
            return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        f_domains = executor.submit(_fetch_domains)
        f_subdomains = executor.submit(_fetch_subdomains)
        f_fields = executor.submit(_fetch_fields)
        f_cats = executor.submit(_fetch_cats)
        f_skills = executor.submit(_fetch_skills)

        domains = f_domains.result()
        subdomains = f_subdomains.result()
        fields = f_fields.result()
        cats = f_cats.result()
        skills = f_skills.result()

    print(f"[PERF]   get_config (parallel) TOTAL: {time.time() - t_total:.3f}s")

    return {
        "domains": domains,
        "subdomains": subdomains,
        "fields_of_interest": fields,
        "skill_categories": cats,
        "skills": skills
    }

def complete_onboarding(client: Client, service_client: Client, student_id: str, data: dict):
    # 1. Ensure the profile and student row exist. This flow must work on a
    #    brand-new student account even when the DB row was never initialized.
    profile_res = service_client.table("profiles").select("id").eq("id", student_id).maybe_single().execute()
    if not profile_res.data:
        name = (data.get("name") or "").strip() or "Student"
        email = (data.get("_email") or data.get("email") or "").strip()
        if not email:
            raise ValueError(
                "Cannot initialize the student profile without the authenticated email."
            )
        service_client.table("profiles").upsert(
            {
                "id": student_id,
                "full_name": name,
                "email": email,
                "role": "student",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="id",
        ).execute()

    student_res = service_client.table("students").select("id").eq("id", student_id).maybe_single().execute()
    if not student_res.data:
        service_client.table("students").upsert(
            {"id": student_id, "is_placed": False},
            on_conflict="id",
        ).execute()

    # 2. Update student row
    update_payload = {
        "bio": data.get("bio"),
        "domain_id": data.get("domain_id"),
        "subdomain_id": data.get("subdomain_id"),
        "interest_id": data.get("interest_id"),
        "onboarding_completed": True
    }
    service_client.table("students").update(update_payload).eq("id", student_id).execute()

    # Keep the public profile name and Auth metadata in sync.
    metadata = {"onboarding_completed": True}
    name = (data.get("name") or "").strip()
    if name:
        metadata["full_name"] = name
        service_client.table("profiles").update(
            {
                "full_name": name,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", student_id).execute()

    # 3. Update auth metadata using the service client (best-effort)
    try:
        service_client.auth.admin.update_user_by_id(
            student_id,
            attributes={"user_metadata": metadata},
        )
    except Exception as exc:
        logger.warning(
            "Could not sync onboarding metadata to Auth user_metadata for student %s: %s",
            student_id,
            exc,
        )

    # 4. Insert skills
    skills = data.get("skills", [])
    for s in skills:
        skill_id = s.get("skill_id")
        proficiency = s.get("proficiency")
        if not skill_id:
            continue

        self_report_score = get_self_report_score(proficiency)

        # Calculate initial confidence (only self-report is present right now)
        confidence = calculate_confidence(self_report_score, 0, 0)

        # Upsert student_skills
        # We assume evidence_score and assessment_score are 0 by default.
        upsert_data = {
            "student_id": student_id,
            "skill_id": skill_id,
            "proficiency": proficiency,
            "self_report_score": self_report_score,
            "assessment_score": 0,
            "evidence_score": 0,
            "proficiency_score": confidence,  # Using this as final confidence score
            "source": "self_report",
            "is_verified": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        service_client.table("student_skills").upsert(
            upsert_data,
            on_conflict="student_id,skill_id",
        ).execute()

    return {"status": "success"}

def submit_assessment(client: Client, student_id: str, data: dict):
    interest_id = data.get("interest_id")
    answers = data.get("answers", [])
    
    questions = get_questions_for_interest(interest_id)
    
    if not questions:
        return {"score": 0}
        
    correct_count = 0
    for ans in answers:
        q_id = ans.get("question_id")
        sel_idx = ans.get("selected_index")
        
        # find question
        q = next((x for x in questions if x["id"] == q_id), None)
        if q and q["correct_index"] == sel_idx:
            correct_count += 1
            
    # Score out of 100
    assessment_score = (correct_count / len(questions)) * 100
    
    # Update all skills with this assessment score
    # In a real app, we'd map questions to specific skills. For MVP, we apply a generic bump to all self-reported skills
    skills_res = client.table("student_skills").select("*").eq("student_id", student_id).execute()
    
    for row in skills_res.data or []:
        new_assessment_score = assessment_score
        
        self_report = float(row.get("self_report_score") or 0)
        evidence = float(row.get("evidence_score") or 0)
        
        new_confidence = calculate_confidence(self_report, new_assessment_score, evidence)
        
        update_data = {
            "assessment_score": new_assessment_score,
            "proficiency_score": new_confidence,
            "source": "assessment" if row.get("source") == "self_report" else row.get("source"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        client.table("student_skills").update(update_data).eq("student_id", student_id).eq("skill_id", row["skill_id"]).execute()

    return {"score": assessment_score}
