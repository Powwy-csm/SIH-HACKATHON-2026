-- =====================================================================
-- BridgeX Student AI — Core Schema (BLOCK 1 of 3)
-- Run this FIRST, in the Supabase SQL Editor, on a brand-new project.
-- Matches app/services/repository.py, app/deps/auth.py, and the
-- schemas/tests inspected in the current backend exactly.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Reference / catalog tables
-- ---------------------------------------------------------------------

create table public.domains (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    created_at  timestamptz not null default now()
);

create table public.skill_categories (
    id          uuid primary key default gen_random_uuid(),
    name        text not null unique,
    created_at  timestamptz not null default now()
);

create table public.skills (
    id           uuid primary key default gen_random_uuid(),
    name         text not null unique,
    category_id  uuid references public.skill_categories(id) on delete set null,
    created_at   timestamptz not null default now()
);
create index idx_skills_category_id on public.skills(category_id);

create table public.companies (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Identity chain: auth.users -> profiles -> students
-- students.id = profiles.id = auth.users.id (per app/deps/auth.py docstring)
-- ---------------------------------------------------------------------

create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    email       text,
    role        text not null default 'student',
    created_at  timestamptz not null default now()
);

create table public.students (
    id              uuid primary key references public.profiles(id) on delete cascade,
    resume_url      text,
    linkedin_url    text,
    github_url      text,
    portfolio_url   text,
    bio             text,
    domain_id       uuid references public.domains(id) on delete set null,
    is_placed       boolean not null default false,
    created_at      timestamptz not null default now()
);
create index idx_students_domain_id on public.students(domain_id);

-- ---------------------------------------------------------------------
-- Student sub-records (app/services/repository.py: fetch_academic_records,
-- fetch_certifications_count, fetch_student_skills)
-- ---------------------------------------------------------------------

create table public.academic_records (
    id                      uuid primary key default gen_random_uuid(),
    student_id              uuid not null references public.students(id) on delete cascade,
    semester                int not null,
    cgpa_till_date          numeric(4,2),
    backlogs                int,
    attendance_percentage   numeric(5,2),
    academic_year           text,
    created_at              timestamptz not null default now()
);
create index idx_academic_records_student_id on public.academic_records(student_id);

create table public.certifications (
    id          uuid primary key default gen_random_uuid(),
    student_id  uuid not null references public.students(id) on delete cascade,
    title       text not null,
    issued_by   text,
    issued_at   date,
    created_at  timestamptz not null default now()
);
create index idx_certifications_student_id on public.certifications(student_id);

create table public.student_skills (
    student_id          uuid not null references public.students(id) on delete cascade,
    skill_id            uuid not null references public.skills(id) on delete cascade,
    proficiency         text,
    proficiency_score   numeric(5,2) not null default 0,
    is_verified         boolean not null default false,
    source              text,
    updated_at          timestamptz not null default now(),
    primary key (student_id, skill_id)
);

-- ---------------------------------------------------------------------
-- Postings / opportunities (app/services/repository.py: fetch_open_postings,
-- fetch_posting, fetch_posting_required_skills)
-- ---------------------------------------------------------------------

create table public.postings (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    company_id  uuid references public.companies(id) on delete set null,
    domain_id   uuid references public.domains(id) on delete set null,
    type        text not null default 'internship'
                    check (type in ('internship', 'placement', 'apprenticeship')),
    status      text not null default 'open'
                    check (status in ('open', 'closed')),
    created_at  timestamptz not null default now()
);
create index idx_postings_status on public.postings(status);
create index idx_postings_domain_id on public.postings(domain_id);

create table public.posting_required_skills (
    posting_id      uuid not null references public.postings(id) on delete cascade,
    skill_id        uuid not null references public.skills(id) on delete cascade,
    required_level  numeric(5,2) not null default 0,
    importance      text not null default 'medium'
                        check (importance in ('low', 'medium', 'high')),
    primary key (posting_id, skill_id)
);

-- ---------------------------------------------------------------------
-- AI-generated cache tables (service-role writes only)
-- ---------------------------------------------------------------------

create table public.recommendations (
    student_id      uuid not null references public.students(id) on delete cascade,
    posting_id      uuid not null references public.postings(id) on delete cascade,
    match_score     numeric(5,2) not null default 0,
    matched_skills  jsonb not null default '[]'::jsonb,
    missing_skills  jsonb not null default '[]'::jsonb,
    reason          text,
    updated_at      timestamptz not null default now(),
    primary key (student_id, posting_id)
);

-- target_role deliberately holds a posting_id string, not a real FK to
-- postings.id -- see app/services/skill_gap_service.py docstring: it is a
-- stable string key used when gap analysis runs against an explicit
-- posting rather than a free-text role name.
create table public.skill_gaps (
    student_id      uuid not null references public.students(id) on delete cascade,
    target_role     text not null,
    skill_id        uuid not null references public.skills(id) on delete cascade,
    current_level   numeric(5,2) not null default 0,
    required_level  numeric(5,2) not null default 0,
    gap             numeric(5,2) generated always as (
                        greatest(required_level - current_level, 0)
                    ) stored,
    priority        text not null default 'low'
                        check (priority in ('low', 'medium', 'high')),
    updated_at      timestamptz not null default now(),
    primary key (student_id, target_role, skill_id)
);
