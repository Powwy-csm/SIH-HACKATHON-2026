#!/usr/bin/env python3
"""
One-time cleanup script:
Completely removes/deletes all existing resume files and data currently stored
in the backend/Supabase storage to establish a clean state (ZERO RESUMES).

Preserves:
- Supabase users and authentication data
- Student profiles and basic details (names, institutions, etc.)
- Verified credentials and certificates
- Unrelated database tables and configuration
"""
import os
import sys
import time
import logging
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Add parent directory to sys.path so we can import app modules if needed
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

load_dotenv(backend_dir / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clean_resumes")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "student-documents")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment.")
    sys.exit(1)


def get_client() -> Client:
    for attempt in range(5):
        try:
            return create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            logger.warning("Attempt %d to connect to Supabase failed: %s. Retrying...", attempt + 1, e)
            time.sleep(2)
    raise RuntimeError("Could not connect to Supabase after 5 attempts.")


def retry_call(fn, max_retries=6, delay=1.5):
    last_err = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            last_err = e
            logger.warning("Operation failed (attempt %d/%d): %s. Retrying in %.1fs...", attempt + 1, max_retries, e, delay)
            time.sleep(delay)
            delay = min(delay * 1.5, 10.0)
    raise last_err


def clean_storage_resumes(client: Client):
    """List and delete all files in the resumes/ folder for each student in the storage bucket."""
    logger.info("Listing objects in storage bucket '%s'...", STORAGE_BUCKET)
    deleted_files = []

    try:
        root_items = retry_call(lambda: client.storage.from_(STORAGE_BUCKET).list()) or []
    except Exception as e:
        logger.warning("Could not list root of storage bucket: %s", e)
        root_items = []

    for item in root_items:
        folder_name = item.get("name")
        if not folder_name:
            continue

        # Look for resumes inside {student_id}/resumes
        resume_folder = f"{folder_name}/resumes"
        try:
            resume_files = retry_call(lambda: client.storage.from_(STORAGE_BUCKET).list(resume_folder)) or []
            paths_to_delete = []
            for rf in resume_files:
                fname = rf.get("name")
                if fname:
                    paths_to_delete.append(f"{resume_folder}/{fname}")

            if paths_to_delete:
                logger.info("Deleting %d resume files in %s: %s", len(paths_to_delete), resume_folder, paths_to_delete)
                retry_call(lambda: client.storage.from_(STORAGE_BUCKET).remove(paths_to_delete))
                deleted_files.extend(paths_to_delete)
        except Exception as e:
            logger.warning("Error checking/deleting files in %s: %s", resume_folder, e)

    logger.info("Total storage resume files deleted: %d", len(deleted_files))
    return deleted_files


def clean_database_resume_data(client: Client):
    """Clean all resume-related database rows."""
    logger.info("Cleaning resume database records...")

    # 1. Clean resume_processing_jobs
    try:
        jobs_res = retry_call(lambda: client.table("resume_processing_jobs").select("id").execute())
        jobs_count = len(jobs_res.data or [])
        if jobs_count > 0:
            logger.info("Deleting %d records from resume_processing_jobs...", jobs_count)
            # Delete in chunks or by filtering where id is not null
            retry_call(lambda: client.table("resume_processing_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute())
            logger.info("resume_processing_jobs table cleaned.")
    except Exception as e:
        logger.warning("Failed to clean resume_processing_jobs: %s", e)

    # 2. Reset students.resume_url to None
    try:
        st_res = retry_call(lambda: client.table("students").select("id").not_.is_("resume_url", "null").execute())
        students_with_resume = st_res.data or []
        if students_with_resume:
            logger.info("Resetting resume_url for %d students...", len(students_with_resume))
            for st in students_with_resume:
                sid = st.get("id")
                retry_call(lambda: client.table("students").update({"resume_url": None}).eq("id", sid).execute())
            logger.info("All student resume_url fields reset to NULL.")
    except Exception as e:
        logger.warning("Failed to reset student resume_url fields: %s", e)

    # 3. Clean student_skills with source='ai_estimated' or resume evidence
    try:
        skills_res = retry_call(lambda: client.table("student_skills").select("student_id, skill_id").eq("source", "ai_estimated").execute())
        ai_skills = skills_res.data or []
        if ai_skills:
            logger.info("Deleting %d ai_estimated skills from student_skills...", len(ai_skills))
            retry_call(lambda: client.table("student_skills").delete().eq("source", "ai_estimated").execute())
            logger.info("student_skills ai_estimated records deleted.")
    except Exception as e:
        logger.warning("Failed to clean ai_estimated student_skills: %s", e)

    # 4. Clean recommendations and skill gaps generated from previous resumes
    try:
        recs_res = retry_call(lambda: client.table("recommendations").select("id").execute())
        if recs_res.data:
            logger.info("Clearing %d old recommendations...", len(recs_res.data))
            retry_call(lambda: client.table("recommendations").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute())
    except Exception as e:
        logger.warning("Failed to clean recommendations: %s", e)

    try:
        gaps_res = retry_call(lambda: client.table("skill_gaps").select("id").execute())
        if gaps_res.data:
            logger.info("Clearing %d old skill gaps...", len(gaps_res.data))
            retry_call(lambda: client.table("skill_gaps").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute())
    except Exception as e:
        logger.warning("Failed to clean skill_gaps: %s", e)

    # 5. Clean student_embeddings
    try:
        emb_res = retry_call(lambda: client.table("student_embeddings").select("student_id").execute())
        if emb_res.data:
            logger.info("Clearing %d old student embeddings...", len(emb_res.data))
            retry_call(lambda: client.table("student_embeddings").delete().neq("student_id", "00000000-0000-0000-0000-000000000000").execute())
    except Exception as e:
        logger.warning("Failed to clean student_embeddings: %s", e)


def verify_clean_state(client: Client):
    """Verify that there are 0 resumes in the system."""
    logger.info("--- VERIFYING CLEAN STATE ---")

    # 1. Check jobs
    jobs = retry_call(lambda: client.table("resume_processing_jobs").select("id").execute()).data or []
    logger.info("resume_processing_jobs count: %d", len(jobs))

    # 2. Check students resume_url
    students_with_resumes = retry_call(
        lambda: client.table("students").select("id").not_.is_("resume_url", "null").execute()
    ).data or []
    logger.info("students with resume_url: %d", len(students_with_resumes))

    # 3. Check ai_estimated student skills
    ai_skills = retry_call(
        lambda: client.table("student_skills").select("student_id, skill_id").eq("source", "ai_estimated").execute()
    ).data or []
    logger.info("ai_estimated student skills count: %d", len(ai_skills))

    # 4. Storage resumes check
    root_items = retry_call(lambda: client.storage.from_(STORAGE_BUCKET).list()) or []
    resume_files_count = 0
    for item in root_items:
        folder_name = item.get("name")
        if folder_name:
            rfiles = retry_call(lambda: client.storage.from_(STORAGE_BUCKET).list(f"{folder_name}/resumes")) or []
            resume_files_count += len(rfiles)

    logger.info("Storage bucket resume files count: %d", resume_files_count)

    success = (len(jobs) == 0 and len(students_with_resumes) == 0 and len(ai_skills) == 0 and resume_files_count == 0)
    if success:
        logger.info("SUCCESS: CLEAN STATE VERIFIED! ZERO EXISTING RESUMES.")
    else:
        logger.warning("Clean state check reported non-zero items.")
    return success


def main():
    logger.info("Starting one-time resume cleanup...")
    client = get_client()
    clean_storage_resumes(client)
    clean_database_resume_data(client)
    verified = verify_clean_state(client)
    if not verified:
        sys.exit(1)
    logger.info("Cleanup completed successfully.")


if __name__ == "__main__":
    main()
