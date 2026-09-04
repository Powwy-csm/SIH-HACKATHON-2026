-- Durable status for the background resume-intelligence pipeline.
-- Run after the existing resume/AI schema migrations.

create table if not exists public.resume_processing_jobs (
    resume_id uuid primary key references public.resumes(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    status text not null check (status in ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
    error text,
    provider text,
    model text,
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz not null default now()
);

create index if not exists idx_resume_processing_jobs_student_id
    on public.resume_processing_jobs(student_id);

alter table public.resume_processing_jobs enable row level security;

create policy "Students can read their own resume processing jobs"
on public.resume_processing_jobs
for select
to authenticated
using (student_id = auth.uid());

-- Inserts/updates are performed only with the server-side service-role client.
-- Service-role requests bypass RLS, so no client write policy is required.
