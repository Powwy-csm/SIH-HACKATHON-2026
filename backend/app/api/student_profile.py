import time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

from app.deps.auth import CurrentStudent, get_current_student
from app.deps.supabase_clients import get_service_client
from app.services import profile_service
from app.services import repository as repo
from app.services.profile_service import analyze_profile

router = APIRouter(prefix="/api/student", tags=["student-profile"])

class ProfileUpdateRequest(BaseModel):
    bio: Optional[str] = None
    domain_id: Optional[str] = None
    subdomain_id: Optional[str] = None
    interest_id: Optional[str] = None

@router.get("/profile")
def get_student_profile(
    current: CurrentStudent = Depends(get_current_student)
):
    """Fetch aggregated student profile including domain hierarchy, skills, academic record, and projects."""
    t0 = time.time()
    result = profile_service.analyze_profile(current.client, current.student_id)
    print(f"[PERF] GET /api/student/profile handler: {time.time() - t0:.3f}s")
    return result

@router.put("/profile")
def update_student_profile(
    body: ProfileUpdateRequest,
    current: CurrentStudent = Depends(get_current_student),
    service_client = Depends(get_service_client)
):
    update_data = body.model_dump(exclude_unset=True)

    # Postgres rejects "" for uuid columns but accepts NULL. Empty string
    # from the frontend means "not selected" and should map to NULL.
    for field in ("domain_id", "subdomain_id", "interest_id"):
        if update_data.get(field) == "":
            update_data[field] = None

    if not update_data:
        return {"status": "no changes"}
    
    res = current.client.table("students").update(update_data).eq("id", current.student_id).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    return {"status": "success", "data": res.data[0]}

class ProjectCreateUpdateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    tags: Optional[List[str]] = []
    project_url: Optional[str] = None

@router.get("/projects")
def list_student_projects(current: CurrentStudent = Depends(get_current_student)):
    t0 = time.time()
    result = repo.fetch_student_projects(current.client, current.student_id)
    print(f"[PERF] GET /api/student/projects handler: {time.time() - t0:.3f}s")
    return result

@router.post("/projects")
def add_student_project(
    body: ProjectCreateUpdateRequest,
    current: CurrentStudent = Depends(get_current_student),
    service_client = Depends(get_service_client)
):
    project = repo.upsert_student_project(
        service_client=service_client,
        student_id=current.student_id,
        project_id=None,
        data=body.model_dump()
    )
    return {"status": "success", "data": project}

@router.put("/projects/{project_id}")
def edit_student_project(
    project_id: str,
    body: ProjectCreateUpdateRequest,
    current: CurrentStudent = Depends(get_current_student),
    service_client = Depends(get_service_client)
):
    # Verify ownership
    existing = current.client.table("student_projects").select("id").eq("id", project_id).eq("student_id", current.student_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")
        
    project = repo.upsert_student_project(
        service_client=service_client,
        student_id=current.student_id,
        project_id=project_id,
        data=body.model_dump()
    )
    return {"status": "success", "data": project}

@router.delete("/projects/{project_id}")
def delete_student_project(
    project_id: str,
    current: CurrentStudent = Depends(get_current_student),
    service_client = Depends(get_service_client)
):
    # Verify ownership
    existing = current.client.table("student_projects").select("id").eq("id", project_id).eq("student_id", current.student_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")
        
    repo.delete_student_project(service_client, current.student_id, project_id)
    return {"status": "success", "id": project_id}
