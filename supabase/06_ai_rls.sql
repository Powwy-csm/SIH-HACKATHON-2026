-- =====================================================================
-- BridgeX Student AI — Phase 1: Resume Pipeline RLS (BLOCK 5)
-- Run this AFTER 05_ai_schema.sql.
--
-- Model (identical to recommendations / skill_gaps in 03_rls.sql):
--   - Students can only SELECT their own resume rows.
--   - No insert/update/delete policy is granted to `authenticated` — all
--     writes to public.resumes happen through the backend's service-role
--     client (app/services/repository.py), which bypasses RLS. The
--     backend enforces "a student can only touch their own resume" in
--     Python by always using the verified student_id from the Supabase
--     JWT (app/deps/auth.py), never a client-supplied id.
--   - No storage.objects policies are added for `authenticated` or
--     `anon` on the `student-documents` bucket. Only the service-role
--     client ever reads/writes storage in this design (see
--     app/services/repository.py: upload_resume_file /
--     create_resume_signed_url), and service-role bypasses storage RLS
--     entirely, same as it bypasses table RLS. If a future phase adds
--     direct client-side uploads, add scoped storage.objects policies
--     then — do not add them speculatively now.
-- =====================================================================

alter table public.resumes enable row level security;

create policy "resumes_select_own"
    on public.resumes for select
    to authenticated
    using (student_id = auth.uid());

-- No insert/update/delete policies for `authenticated` — intentional,
-- see header. No policies granted to `anon` at all.
