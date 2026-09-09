-- =====================================================================
-- BridgeX — Migration 13: Industry-Student Opportunity/Application Flow
-- Run in Supabase SQL Editor
-- =====================================================================

-- 0. Add full_name to profiles (needed for applicant display)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS full_name text;

-- Backfill full_name from auth.users metadata for existing users
UPDATE public.profiles p
SET full_name = COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(p.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id
  AND p.full_name IS NULL;

-- Update trigger to also store full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _role      text;
    _full_name text;
BEGIN
    _role := COALESCE(
        new.raw_user_meta_data->>'role',
        new.raw_app_meta_data->>'role',
        'student'
    );
    _full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (new.id, new.email, _role, _full_name)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

    IF _role = 'student' THEN
        INSERT INTO public.students (id, is_placed)
        VALUES (new.id, false)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
END;
$$;

-- 1. Extend postings table with additional columns needed for the full flow
ALTER TABLE public.postings
    ADD COLUMN IF NOT EXISTS description         text,
    ADD COLUMN IF NOT EXISTS location            text,
    ADD COLUMN IF NOT EXISTS mode                text DEFAULT 'on-site'
                                                     CHECK (mode IN ('on-site','remote','hybrid')),
    ADD COLUMN IF NOT EXISTS duration_months     numeric(4,1),
    ADD COLUMN IF NOT EXISTS stipend_text        text,
    ADD COLUMN IF NOT EXISTS eligibility_criteria text,
    ADD COLUMN IF NOT EXISTS openings            int DEFAULT 1,
    ADD COLUMN IF NOT EXISTS application_deadline date,
    ADD COLUMN IF NOT EXISTS posted_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS skills_list         text[] DEFAULT '{}';

-- 2. Expand the type CHECK constraint to include training and bootcamp
--    (drop old constraint, re-add with new values)
ALTER TABLE public.postings DROP CONSTRAINT IF EXISTS postings_type_check;
ALTER TABLE public.postings
    ADD CONSTRAINT postings_type_check
    CHECK (type IN ('internship','placement','apprenticeship','training','bootcamp'));

-- 3. Ensure companies table has all needed columns (it may be minimal in base schema)
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS admin_profile_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS industry_sector     text,
    ADD COLUMN IF NOT EXISTS company_size        text,
    ADD COLUMN IF NOT EXISTS description         text,
    ADD COLUMN IF NOT EXISTS logo_url            text,
    ADD COLUMN IF NOT EXISTS website             text,
    ADD COLUMN IF NOT EXISTS address             text,
    ADD COLUMN IF NOT EXISTS city                text,
    ADD COLUMN IF NOT EXISTS state               text,
    ADD COLUMN IF NOT EXISTS contact_email       text,
    ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending'
                                                     CHECK (verification_status IN ('pending','verified','rejected'));

-- 4. Create applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.applications (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    posting_id   uuid NOT NULL REFERENCES public.postings(id) ON DELETE CASCADE,
    student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'applied'
                     CHECK (status IN ('applied','reviewing','shortlisted','interview_scheduled','selected','rejected')),
    cover_letter text,
    applied_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (posting_id, student_id)   -- prevent duplicate applications
);

CREATE INDEX IF NOT EXISTS idx_applications_posting_id  ON public.applications(posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id  ON public.applications(student_id);

-- 5. Enable RLS on applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 5a. Students: full CRUD on their own applications
DROP POLICY IF EXISTS "applications_select_own_student"  ON public.applications;
CREATE POLICY "applications_select_own_student"
    ON public.applications FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "applications_insert_own_student"  ON public.applications;
CREATE POLICY "applications_insert_own_student"
    ON public.applications FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "applications_update_own_student"  ON public.applications;
CREATE POLICY "applications_update_own_student"
    ON public.applications FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());

-- 5b. Industry/company admin: can read applications for postings they own
DROP POLICY IF EXISTS "applications_select_company"  ON public.applications;
CREATE POLICY "applications_select_company"
    ON public.applications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.postings p
            WHERE p.id = applications.posting_id
              AND (
                  p.posted_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.companies c
                      WHERE c.id = p.company_id
                        AND c.admin_profile_id = auth.uid()
                  )
              )
        )
    );

-- 6. RLS for postings: industry can insert/update their own postings
DROP POLICY IF EXISTS "postings_insert_company"  ON public.postings;
CREATE POLICY "postings_insert_company"
    ON public.postings FOR INSERT
    TO authenticated
    WITH CHECK (posted_by = auth.uid());

DROP POLICY IF EXISTS "postings_update_company"  ON public.postings;
CREATE POLICY "postings_update_company"
    ON public.postings FOR UPDATE
    TO authenticated
    USING (
        posted_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = postings.company_id
              AND c.admin_profile_id = auth.uid()
        )
    );

-- 7. Companies: industry admin can insert and update their own company row
DROP POLICY IF EXISTS "companies_insert_own"  ON public.companies;
CREATE POLICY "companies_insert_own"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (admin_profile_id = auth.uid());

DROP POLICY IF EXISTS "companies_update_own"  ON public.companies;
CREATE POLICY "companies_update_own"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (admin_profile_id = auth.uid());

-- 8. Allow students to be read by authenticated company admins (for applicant profiles)
DROP POLICY IF EXISTS "students_select_by_company"  ON public.students;
CREATE POLICY "students_select_by_company"
    ON public.students FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.applications a
            JOIN public.postings p ON p.id = a.posting_id
            WHERE a.student_id = students.id
              AND (
                  p.posted_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.companies c
                      WHERE c.id = p.company_id
                        AND c.admin_profile_id = auth.uid()
                  )
              )
        )
    );

-- 9. Profiles also readable by companies for their applicants
DROP POLICY IF EXISTS "profiles_select_by_company"  ON public.profiles;
CREATE POLICY "profiles_select_by_company"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.applications a
            JOIN public.postings p ON p.id = a.posting_id
            WHERE a.student_id = profiles.id
              AND (
                  p.posted_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.companies c
                      WHERE c.id = p.company_id
                        AND c.admin_profile_id = auth.uid()
                  )
              )
        )
    );

-- 10. Student skills also readable by companies for their applicants
DROP POLICY IF EXISTS "student_skills_select_by_company"  ON public.student_skills;
CREATE POLICY "student_skills_select_by_company"
    ON public.student_skills FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.applications a
            JOIN public.postings p ON p.id = a.posting_id
            WHERE a.student_id = student_skills.student_id
              AND (
                  p.posted_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.companies c
                      WHERE c.id = p.company_id
                        AND c.admin_profile_id = auth.uid()
                  )
              )
        )
    );

-- 11. Certifications readable by companies for their applicants
DROP POLICY IF EXISTS "certifications_select_by_company"  ON public.certifications;
CREATE POLICY "certifications_select_by_company"
    ON public.certifications FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.applications a
            JOIN public.postings p ON p.id = a.posting_id
            WHERE a.student_id = certifications.student_id
              AND (
                  p.posted_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.companies c
                      WHERE c.id = p.company_id
                        AND c.admin_profile_id = auth.uid()
                  )
              )
        )
    );

SELECT 'Migration 13 applied successfully' AS result;
