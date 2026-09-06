-- =====================================================================
-- BridgeX Student AI — Performance Indexes
-- Adds foreign key and composite sorting indexes to optimize profile,
-- projects, resume, and skills queries.
-- =====================================================================

-- 1. Student Projects
create index if not exists idx_student_projects_student_id 
    on public.student_projects(student_id);
create index if not exists idx_student_projects_student_created 
    on public.student_projects(student_id, created_at desc);

-- 2. Resumes & Document Jobs
create index if not exists idx_resumes_student_id 
    on public.resumes(student_id);
create index if not exists idx_resumes_student_created 
    on public.resumes(student_id, created_at desc);
create index if not exists idx_resume_processing_jobs_student_id 
    on public.resume_processing_jobs(student_id);

-- 3. Student Skills & Academics
create index if not exists idx_student_skills_student_id 
    on public.student_skills(student_id);
create index if not exists idx_academic_records_student_id 
    on public.academic_records(student_id);
create index if not exists idx_certifications_student_id 
    on public.certifications(student_id);

-- 4. Domain & Skills Taxonomy
create index if not exists idx_subdomains_domain_id 
    on public.subdomains(domain_id);
create index if not exists idx_fields_of_interest_subdomain_id 
    on public.fields_of_interest(subdomain_id);
create index if not exists idx_skills_category_id 
    on public.skills(category_id);
