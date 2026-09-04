-- =====================================================================
-- BridgeX Student AI — Row Level Security (BLOCK 3 of 3)
-- Run this THIRD, after 01_schema.sql and 02_trigger.sql.
--
-- Model:
--   - The backend's scoped client (anon key + student's own JWT) does all
--     reads named in app/services/repository.py. RLS below allows exactly
--     those reads and nothing more.
--   - The backend's service-role client (SUPABASE_SERVICE_ROLE_KEY,
--     server-side only) does the writes to recommendations/skill_gaps.
--     Service role bypasses RLS entirely, so no write policy is needed
--     for it, and no write policy is granted to the `authenticated` role
--     for these tables.
--   - No table is writable directly by `authenticated` or `anon` other
--     than through the auth.users trigger (profiles/students) or the
--     service-role backend (recommendations/skill_gaps).
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.academic_records enable row level security;
alter table public.certifications enable row level security;
alter table public.student_skills enable row level security;
alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;
alter table public.companies enable row level security;
alter table public.domains enable row level security;
alter table public.postings enable row level security;
alter table public.posting_required_skills enable row level security;
alter table public.recommendations enable row level security;
alter table public.skill_gaps enable row level security;

-- ---------------------------------------------------------------------
-- Own-row-only data (auth.py resolves student_id = auth.uid())
-- ---------------------------------------------------------------------

create policy "profiles_select_own"
    on public.profiles for select
    to authenticated
    using (id = auth.uid());

create policy "students_select_own"
    on public.students for select
    to authenticated
    using (id = auth.uid());

create policy "academic_records_select_own"
    on public.academic_records for select
    to authenticated
    using (student_id = auth.uid());

create policy "certifications_select_own"
    on public.certifications for select
    to authenticated
    using (student_id = auth.uid());

create policy "student_skills_select_own"
    on public.student_skills for select
    to authenticated
    using (student_id = auth.uid());

create policy "recommendations_select_own"
    on public.recommendations for select
    to authenticated
    using (student_id = auth.uid());

create policy "skill_gaps_select_own"
    on public.skill_gaps for select
    to authenticated
    using (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- Read-only reference/catalog data for any authenticated user
-- (fetch_open_postings, fetch_posting, fetch_posting_required_skills,
-- and the skills(name, skill_categories(name)) / companies(name) embeds)
-- ---------------------------------------------------------------------

create policy "domains_select_authenticated"
    on public.domains for select
    to authenticated
    using (true);

create policy "skill_categories_select_authenticated"
    on public.skill_categories for select
    to authenticated
    using (true);

create policy "skills_select_authenticated"
    on public.skills for select
    to authenticated
    using (true);

create policy "companies_select_authenticated"
    on public.companies for select
    to authenticated
    using (true);

create policy "postings_select_authenticated"
    on public.postings for select
    to authenticated
    using (true);

create policy "posting_required_skills_select_authenticated"
    on public.posting_required_skills for select
    to authenticated
    using (true);

-- No insert/update/delete policies exist for `authenticated` on any table
-- above -- that is intentional. Writes to profiles/students happen only
-- via the SECURITY DEFINER trigger (02_trigger.sql). Writes to
-- recommendations/skill_gaps happen only via the backend's service-role
-- client, which bypasses RLS and needs no policy here.
-- No policies are granted to `anon` at all.
