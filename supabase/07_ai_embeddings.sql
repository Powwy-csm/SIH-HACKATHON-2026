-- =====================================================================
-- BridgeX Student AI — Phase 2: AI Skill Extraction + Embeddings (BLOCK 6)
-- Run this AFTER 01_schema.sql .. 06_ai_rls.sql.
--
-- Adds:
--   1. pgvector extension + public.student_embeddings
--   2. public.skill_aliases        — synonym table used by the normalization
--      pipeline (backend/app/services/skill_normalization_service.py)
--   3. public.extracted_skill_candidates — full audit trail of every AI
--      skill extraction + normalization attempt (matched or not), so
--      student_skills is never the only record of what the AI produced.
--
-- Ownership model matches 05_ai_schema.sql / 06_ai_rls.sql exactly: all
-- writes to these tables go through the backend's service-role client.
-- Students get read-only access to their own rows via RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- pgvector
-- ---------------------------------------------------------------------
create extension if not exists vector;

-- ---------------------------------------------------------------------
-- Skill synonyms / aliases (normalization pipeline, alias step).
-- Empty by default — populate as you discover real-world AI phrasing
-- ("JS" -> the "JavaScript" skill row, etc). Safe to leave empty; the
-- pipeline just falls through to fuzzy matching.
-- ---------------------------------------------------------------------
create table public.skill_aliases (
    id          uuid primary key default gen_random_uuid(),
    skill_id    uuid not null references public.skills(id) on delete cascade,
    alias       text not null,
    created_at  timestamptz not null default now(),
    unique (alias)
);
create index idx_skill_aliases_skill_id on public.skill_aliases(skill_id);

-- ---------------------------------------------------------------------
-- Extraction / normalization audit trail
-- ---------------------------------------------------------------------
create table public.extracted_skill_candidates (
    id                          uuid primary key default gen_random_uuid(),
    student_id                  uuid not null references public.students(id) on delete cascade,
    resume_id                   uuid not null references public.resumes(id) on delete cascade,

    raw_skill_name              text not null,        -- exactly what the AI returned
    normalized_skill_name       text,                  -- after text normalization

    skill_id                    uuid references public.skills(id) on delete set null,
    extraction_confidence       numeric(4,3),          -- 0.000 - 1.000, from the AI provider
    normalization_confidence    numeric(4,3),          -- 0.000 - 1.000, from the matching step

    status                      text not null
                                    check (status in ('matched', 'unmatched', 'rejected')),
    -- Human-readable note for cases the status alone can't explain, e.g.
    -- "matched, but student_skills left unchanged: already verified".
    note                        text,

    source                      text not null default 'ai_estimated',
    provider                    text not null,          -- e.g. "gemini"
    model                       text not null,          -- e.g. "gemini-2.0-flash"

    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);
create index idx_esc_student_id on public.extracted_skill_candidates(student_id);
create index idx_esc_resume_id on public.extracted_skill_candidates(resume_id);
create index idx_esc_student_created on public.extracted_skill_candidates(student_id, created_at desc);

-- ---------------------------------------------------------------------
-- Student profile/resume embeddings.
-- One row per student (upserted on reprocessing) — content_hash lets the
-- backend skip regenerating the embedding when nothing meaningful in the
-- source profile document changed.
--
-- IMPORTANT: vector(768) below matches the default embedding model
-- documented in backend/.env.example (Gemini text-embedding-004, which
-- produces 768-dimension vectors). If you change EMBEDDING_DIMENSIONS in
-- the backend config to use a different provider/model, you MUST update
-- this column's dimension to match (see handoff notes) — a mismatch will
-- fail at insert time, not silently corrupt data.
-- ---------------------------------------------------------------------
create table public.student_embeddings (
    id                  uuid primary key default gen_random_uuid(),
    student_id          uuid not null unique references public.students(id) on delete cascade,

    embedding           vector(768) not null,
    embedding_model     text not null,      -- e.g. "gemini:text-embedding-004"
    content_hash        text not null,      -- sha256 of the profile document that produced this embedding
    source_version      text,               -- free-text tag, e.g. resume_id used to build the document

    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
create index idx_student_embeddings_student_id on public.student_embeddings(student_id);
-- ivfflat index deferred: needs a representative row count to pick `lists`
-- sensibly, and is pointless at hackathon-demo data volumes. Add later:
--   create index on public.student_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------
-- RLS — same pattern as resumes (06_ai_rls.sql): students can read their
-- own rows; all writes happen through the service-role client only.
-- ---------------------------------------------------------------------
alter table public.skill_aliases enable row level security;
alter table public.extracted_skill_candidates enable row level security;
alter table public.student_embeddings enable row level security;

create policy "skill_aliases_select_authenticated"
    on public.skill_aliases for select
    to authenticated
    using (true);

create policy "extracted_skill_candidates_select_own"
    on public.extracted_skill_candidates for select
    to authenticated
    using (student_id = auth.uid());

create policy "student_embeddings_select_own"
    on public.student_embeddings for select
    to authenticated
    using (student_id = auth.uid());

-- No insert/update/delete policies for `authenticated` on any of the
-- three tables above — intentional, matching every other AI-writes table
-- in this project. No policies granted to `anon` at all.
