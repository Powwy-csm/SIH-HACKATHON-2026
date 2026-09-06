import logging
from datetime import datetime, timezone
from supabase import Client
from app.schemas.onboarding_data import get_self_report_score, calculate_confidence, get_questions_for_interest

logger = logging.getLogger(__name__)

def get_config(client: Client):
    # Fetch domains
    res_domains = client.table("domains").select("id, name").execute()
    domains = res_domains.data or []

    # Fetch subdomains
    # Using maybe_single or checking if the table exists could be tricky if we don't have it, but we assume the SQL is run.
    try:
        res_subdomains = client.table("subdomains").select("id, domain_id, name").execute()
        subdomains = res_subdomains.data or []
    except Exception as e:
        logger.warning(f"Could not fetch subdomains (maybe table missing): {e}")
        subdomains = []

    # Fetch fields_of_interest
    try:
        res_fields = client.table("fields_of_interest").select("id, subdomain_id, name").execute()
        fields = res_fields.data or []
    except Exception as e:
        logger.warning(f"Could not fetch fields of interest: {e}")
        fields = []

    # Fetch skill categories and skills
    res_cats = client.table("skill_categories").select("id, name").execute()
    cats = res_cats.data or []
    
    res_skills = client.table("skills").select("id, name, category_id").execute()
    skills = res_skills.data or []

    return {
        "domains": domains,
        "subdomains": subdomains,
        "fields_of_interest": fields,
        "skill_categories": cats,
        "skills": skills
    }

def complete_onboarding(client: Client, service_client: Client, student_id: str, data: dict):
    # 1. Ensure student profile exists. It should be created by trigger, but just in case:
    student_res = client.table("students").select("id").eq("id", student_id).execute()
    if not student_res.data:
        # Create profile and student if trigger didn't fire or failed
        client.table("profiles").insert({"id": student_id, "role": "student"}).execute()
        client.table("students").insert({"id": student_id, "is_placed": False}).execute()

    # 2. Update student row
    update_payload = {
        "bio": data.get("bio"),
        "domain_id": data.get("domain_id"),
        "onboarding_completed": True
    }
    # Add optional keys safely
    if "subdomain_id" in data:
        update_payload["subdomain_id"] = data["subdomain_id"]
    if "interest_id" in data:
        update_payload["interest_id"] = data["interest_id"]
        
    client.table("students").update(update_payload).eq("id", student_id).execute()

    # 3. Update auth metadata using the service client (best-effort)
    try:
        service_client.auth.admin.update_user_by_id(
            student_id,
            attributes={"user_metadata": {"onboarding_completed": True}},
        )
    except Exception as exc:
        logger.warning(
            "Could not sync onboarding_completed to Auth user_metadata for student %s: %s",
            student_id,
            exc,
        )

    # 4. Insert skills
    skills = data.get("skills", [])
    for s in skills:
        skill_id = s.get("skill_id")
        proficiency = s.get("proficiency")
        
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
            "proficiency_score": confidence, # Using this as final confidence score
            "source": "self_report",
            "is_verified": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        client.table("student_skills").upsert(upsert_data).execute()

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
