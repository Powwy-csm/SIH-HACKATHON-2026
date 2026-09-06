-- =====================================================================
-- BridgeX Student AI — Grant & RLS Policies for Student Profile Updates (BLOCK 6)
-- Run this in the Supabase SQL Editor.
--
-- Security Model:
--   - Authenticated student can SELECT and UPDATE their OWN record in public.students.
--   - Authenticated student CANNOT update or view any other student's record.
--   - Authenticated student can SELECT, INSERT, and UPDATE their OWN skills in public.student_skills.
--   - Authenticated student can SELECT catalog data (subdomains, fields_of_interest).
--   - Unrestricted access is NEVER granted.
--   - Service-role permissions remain untouched (bypasses RLS).
--   - No Industry or Institution policies are modified.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table Grants for `authenticated` role
-- (PostgreSQL checks table-level privileges before evaluating RLS policies)
-- ---------------------------------------------------------------------
grant select, update on public.students to authenticated;
grant select, insert, update on public.student_skills to authenticated;
grant select on public.subdomains to authenticated;
grant select on public.fields_of_interest to authenticated;

-- ---------------------------------------------------------------------
-- 2. RLS UPDATE Policy on public.students
-- (Restricted strictly to the authenticated student's own UID)
-- ---------------------------------------------------------------------
drop policy if exists "students_update_own" on public.students;
create policy "students_update_own"
    on public.students for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. RLS INSERT and UPDATE Policies on public.student_skills
-- (Restricted strictly to rows where student_id matches auth.uid())
-- ---------------------------------------------------------------------
drop policy if exists "student_skills_insert_own" on public.student_skills;
create policy "student_skills_insert_own"
    on public.student_skills for insert
    to authenticated
    with check (student_id = auth.uid());

drop policy if exists "student_skills_update_own" on public.student_skills;
create policy "student_skills_update_own"
    on public.student_skills for update
    to authenticated
    using (student_id = auth.uid())
    with check (student_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. RLS SELECT Policies on subdomains and fields_of_interest
-- ---------------------------------------------------------------------
alter table public.subdomains enable row level security;
drop policy if exists "subdomains_select_authenticated" on public.subdomains;
create policy "subdomains_select_authenticated"
    on public.subdomains for select
    to authenticated
    using (true);

alter table public.fields_of_interest enable row level security;
drop policy if exists "fields_of_interest_select_authenticated" on public.fields_of_interest;
create policy "fields_of_interest_select_authenticated"
    on public.fields_of_interest for select
    to authenticated
    using (true);
