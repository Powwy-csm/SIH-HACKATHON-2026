-- =====================================================================
-- BridgeX Student AI — Phase 2: Onboarding Schema
-- Adds hierarchical domain structure and onboarding status
-- =====================================================================

create table if not exists public.subdomains (
    id          uuid primary key default gen_random_uuid(),
    domain_id   uuid not null references public.domains(id) on delete cascade,
    name        text not null,
    created_at  timestamptz not null default now(),
    unique(domain_id, name)
);
create index if not exists idx_subdomains_domain_id on public.subdomains(domain_id);

create table if not exists public.fields_of_interest (
    id             uuid primary key default gen_random_uuid(),
    subdomain_id   uuid not null references public.subdomains(id) on delete cascade,
    name           text not null,
    created_at     timestamptz not null default now(),
    unique(subdomain_id, name)
);
create index if not exists idx_fields_of_interest_subdomain_id on public.fields_of_interest(subdomain_id);

-- Update students table
alter table public.students add column if not exists subdomain_id uuid references public.subdomains(id) on delete set null;
alter table public.students add column if not exists interest_id uuid references public.fields_of_interest(id) on delete set null;
alter table public.students add column if not exists onboarding_completed boolean not null default false;

-- Add columns to student_skills to track confidence separately
alter table public.student_skills add column if not exists self_report_score numeric(5,2) default 0;
alter table public.student_skills add column if not exists assessment_score numeric(5,2) default 0;
alter table public.student_skills add column if not exists evidence_score numeric(5,2) default 0;
