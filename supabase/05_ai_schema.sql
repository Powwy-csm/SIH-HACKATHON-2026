-- =====================================================================
-- BridgeX Student AI — Phase 1: Resume Pipeline Schema (BLOCK 4)
-- Run this AFTER 01_schema.sql, 02_trigger.sql, 03_rls.sql.
--
-- Adds:
--   1. A private Storage bucket for student resumes/documents.
--   2. public.resumes — resume metadata + extracted text, separate from
--      `students` so large raw text never bloats the frequently-read
--      students row (per the approved decision).
--
-- Ownership model: every write to this table and to the storage bucket
-- happens through the backend's service-role client only (same pattern
-- as `recommendations` / `skill_gaps`). The storage_path is always
-- constructed server-side from the authenticated student's verified id
-- ({student_id}/resumes/{generated_filename}) — the client never
-- supplies or controls the path, so a student cannot write into another
-- student's folder even though RLS/storage policies aren't the layer
-- enforcing it here (see 06_ai_rls.sql for why no `authenticated`
-- policies are needed on this bucket).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Storage bucket (private). Safe/idempotent — if your Supabase project
-- restricts creating buckets via SQL, create it manually instead (see
-- the handoff notes / README for the manual dashboard steps).
-- file_size_limit + allowed_mime_types are enforced by Supabase Storage
-- itself as defense-in-depth, independent of the backend's own checks.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'student-documents',
    'student-documents',
    false,
    10485760, -- 10 MB, matches RESUME_MAX_FILE_SIZE_BYTES default in app/config.py
    array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
on conflict (id) do update
    set file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Resume metadata + extracted text
-- ---------------------------------------------------------------------
create table public.resumes (
    id                  uuid primary key default gen_random_uuid(),
    student_id          uuid not null references public.students(id) on delete cascade,

    -- Storage location: "{student_id}/resumes/{generated_filename}" in the
    -- `student-documents` bucket. Not a public URL — the bucket is private,
    -- so callers must request a short-lived signed URL to download.
    storage_path        text not null,
    file_name           text not null,   -- original filename, for display only
    file_type           text not null check (file_type in ('pdf', 'docx')),
    file_size           bigint not null check (file_size > 0),

    extracted_text       text,
    extraction_status    text not null default 'uploaded'
                             check (extraction_status in ('uploaded', 'extracting', 'extracted', 'failed')),
    extraction_error     text,

    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

create index idx_resumes_student_id on public.resumes(student_id);
create index idx_resumes_student_created on public.resumes(student_id, created_at desc);
