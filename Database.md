# SIH26044 — Final Database Reference
### Portal for Academia-Industry Collaboration (Skill Mapping, Internships & Placement)
**Backend: Supabase (PostgreSQL + Auth + Storage) | Status: Phase 1 + Phase 2 complete**

**Setup:** run `sih26044_MASTER_SETUP.sql` once in a fresh project's SQL Editor (it's all 9 scripts combined, in order). Then create the 4 Storage buckets manually in the dashboard (see §9).

---

## 1. Full Table List (32 tables + 1 view)

| Module | Tables |
|---|---|
| Auth & taxonomy | `profiles`, `domains`, `subdomains`, `roles`, `role_skills` |
| Academia | `institutions`, `courses`, `students`, `academic_records` |
| Industry | `companies`, `partnerships` |
| Skills | `skill_categories`, `skills`, `student_skills` |
| Postings & outcomes | `postings`, `posting_required_skills`, `applications`, `placement_drives`, `placement_drive_applications`, `placements` |
| AI matching | `recommendations`, `skill_gaps` |
| Evidence & growth | `projects`, `project_skills`, `assessments`, `assessment_questions`, `assessment_attempts`, `assessment_answers`, `learning_programs`, `learning_program_skills`, `certifications` |
| Engagement | `feedback_ratings`, `notifications` |
| View | `institution_placement_summary` |

---

## 2. Core Relationship Map

```
DOMAIN → SUBDOMAIN → ROLE → ROLE_SKILLS ─┐
                       ↑                  ↓
INSTITUTION → STUDENT → STUDENT_SKILLS → SKILLS ← POSTING_REQUIRED_SKILLS ← POSTING ← COMPANY
                 ↓            ↑                                              ↓
            PROJECTS      ASSESSMENTS                                  APPLICATION
                 ↓            ↓                                              ↓
          PROJECT_SKILLS  ASSESSMENT_ATTEMPTS                          PLACEMENT_DRIVE
                 ↓                                                           ↓
      RECOMMENDATIONS ← ← ← ← AI MATCHING (external service) → → →     PLACEMENT
      SKILL_GAPS → LEARNING_PROGRAMS
```

---

## 3. Table Reference

### `profiles` — extends `auth.users` 1:1, auto-created on signup
id (PK=auth.users.id), full_name, email, phone, role (enum), avatar_url, created_at, updated_at

### `domains` — 7 seeded rows
id, name, description
> Computer Science & IT · Healthcare & Ayurveda · Biotechnology · Engineering · Management & Finance · Agriculture · Marketing

### `subdomains` — 16 seeded rows, FK → domains

### `roles` — 205 seeded rows, FK → subdomains
id, subdomain_id, name, level, demand_score, internship_suitability, description, created_at
> `level`/`demand_score`/`internship_suitability`/`description` are currently NULL for most roles — fill in manually or via a future AI enrichment pass.

### `role_skills` — 1,202 seeded rows
role_id, skill_id, weight, required_level (PK: role_id+skill_id)
> Agriculture's 15 roles have individually hand-tuned mappings. The other 190 roles currently share one skill profile per subdomain (e.g. all "Data & AI" roles use the same 6 skills/weights) — a v1 you can refine per-role later.

### `institutions`
id, admin_profile_id (FK→profiles), domain_id, name, institution_type, affiliation_body, accreditation_grade, address, city, state, pincode, website, logo_url, contact_email, contact_phone, verification_status (enum), created_at, updated_at

### `courses`
id, institution_id, name, level, department, duration_years

### `students`
id (=profiles.id), institution_id, course_id, domain_id, enrollment_number, branch, year_of_study, graduation_year, cgpa, resume_url, linkedin_url, github_url, portfolio_url, bio, date_of_birth, gender, is_placed (auto-synced), created_at, updated_at

### `academic_records`
id, student_id, semester, sgpa, cgpa_till_date, backlogs, attendance_percentage, marksheet_url, academic_year

### `companies`
id, admin_profile_id, domain_id, name, industry_sector, company_size, description, logo_url, website, address, city, state, contact_person, contact_email, contact_phone, verification_status (enum), created_at, updated_at

### `partnerships` — MOUs
id, institution_id, company_id, mou_title, start_date, end_date, document_url, status

### `skill_categories`
id, name

### `skills` — 93 seeded rows
id, category_id (FK), category (text: domain/tech/soft), name, slug, description
> Both `category_id` (structured) and `category` (quick text filter) exist — use whichever fits the query.

### `student_skills` — the core skill-mapping table
student_id, skill_id, proficiency (enum label), proficiency_score (0–100 numeric), source (student_added/assessment/institution_verified/certificate/ai_estimated), is_verified, verified_by, last_practiced_at, evidence_url, source_confidence, self_rating, verified_rating

### `postings` — internships & placements from companies
id, company_id, domain_id, role_id (optional link to standard role), posted_by, title, description, type (enum), mode (enum), location, duration_months, stipend_min/max, package_min/max, openings, eligibility_criteria, application_deadline, status (enum), required_degree, min_cgpa, preferred_year, experience_required, remote_friendly, skills_extracted_jsonb

### `posting_required_skills`
posting_id, skill_id, minimum_proficiency (enum), required_level (0–100), importance (low/medium/high)

### `applications`
id, posting_id, student_id, status (enum), cover_letter, applied_at, updated_at

### `placement_drives` / `placement_drive_applications`
Campus drive events tied to institution + company, with their own application tracking

### `placements` — final confirmed outcome
id, student_id, company_id, institution_id, posting_id, drive_id, source (enum), job_title, job_location, employment_type, package_offered, offer_letter_url, offer_date, joining_date, status (enum)
> Trigger auto-sets `students.is_placed = true` on offer_accepted/joined.

### `recommendations` — AI match output
id, student_id, posting_id (nullable), role_id (nullable — one of the two must be set), match_score (0–100), matched_skills (jsonb), missing_skills (jsonb), reason, recommendation_type, explanation_jsonb, priority, actionable_next_step

### `skill_gaps`
id, student_id, target_role (text label), role_id (FK, structured), skill_id, current_level, required_level, gap (**generated column**), priority

### `projects` — portfolio evidence
id, student_id, domain_id, title, description, tools_used (text[]), github_url, live_url, role_tag, is_verified, verified_by

### `project_skills`
project_id, skill_id

### `assessments` / `assessment_questions` / `assessment_attempts` / `assessment_answers`
Full skill-test pipeline — a completed attempt's score should be written back into `student_skills.proficiency_score` with `source = 'assessment'`.
> ⚠️ `assessment_questions.correct_answer` is currently readable by any authenticated user via RLS. Fine for hackathon demo; for production, grade server-side via an Edge Function using the service role key instead.

### `certifications`
id, student_id, title, issuing_organization, issue_date, credential_url, is_verified

### `learning_programs` / `learning_program_skills`
Training content tied to specific skills — query by `skill_gaps.skill_id` to recommend "what to learn next."

### `feedback_ratings`
given_by, target_type (student/company/institution), target_id, posting_id, rating (1–5), comments

### `notifications`
profile_id, title, message, link_url, is_read

### View: `institution_placement_summary`
Pre-aggregated: total_students, students_placed, placement_percentage, avg_package_offered, highest_package_offered — per institution, computed live from `placements`.

---

## 4. Enum Types

`user_role`, `verification_status`, `proficiency_level`, `posting_type`, `posting_mode`, `posting_status`, `application_status`, `drive_status`, `feedback_target`, `placement_outcome_status`, `placement_source`, `assessment_type`

---

## 5. Match Score Formula (for the AI/backend service)

```
match_score = Σ (student_skill.proficiency_score × role_skill.weight)
              ────────────────────────────────────────────────────
                          Σ (role_skill.weight)
```
Computed per student per role (or per posting, using `posting_required_skills` instead). The AI service reads `student_skills` + `role_skills`/`posting_required_skills`, computes this, and writes the result into `recommendations` and `skill_gaps` using the **service role key** (bypasses RLS — never expose this key to the frontend).

---

## 6. RLS — Who Can Do What

| Role | Access |
|---|---|
| Student | Full CRUD on own `students`, `student_skills`, `applications`, `projects`, `assessment_attempts`. Read-only on own `recommendations`, `skill_gaps`, `academic_records`, `placements` |
| Institution admin | Full CRUD on own `institutions` row. Read-only on students/records/skill-gaps within their institution |
| Company/Industry admin | Full CRUD on own `companies` row + its `postings`, `learning_programs`. Read applications & recommendations tied to their postings |
| Any authenticated user | Read-only on reference/public data: `domains`, `subdomains`, `roles`, `role_skills`, `skills`, `skill_categories`, `institutions`, `companies`, `courses`, open `postings`, `projects`, `assessments`, `learning_programs` |
| Service role (backend/AI jobs only) | Bypasses RLS entirely — server-side code only, never the frontend |

Supabase grants base table access to `authenticated`/`anon` roles automatically — RLS policies are the actual access gate, so no manual `GRANT` statements are needed here.

---

## 7. Frontend Integration Notes

- **Client setup:** `@supabase/supabase-js`, initialized with the **Project URL** + **anon public key** (Settings → API). Never ship the service role key to the frontend.
- **Auth:** sign up via `supabase.auth.signUp()` with `options.data.role` and `options.data.full_name` in the metadata — the `handle_new_user` trigger reads these to create the `profiles` row automatically.
- **File uploads:** always upload to `{bucket}/{auth.uid()}/{filename}` — the storage RLS policies require the first folder segment to exactly match the logged-in user's ID, or the upload is rejected.
- **Reading match scores:** frontend should only ever `select` from `recommendations`/`skill_gaps` (read-only per RLS) — never try to `insert` into them from the client; that has to go through your backend/AI service.
- **Typed client (optional):** run `supabase gen types typescript --project-id <id>` to generate TypeScript types matching this exact schema for your frontend.

---

## 8. Storage Buckets

| Bucket | Access | Path convention |
|---|---|---|
| `avatars` | Public | `avatars/{user_id}/filename` |
| `org-logos` | Public | `org-logos/{user_id}/filename` |
| `student-documents` | Private | `student-documents/{student_id}/filename` |
| `official-documents` | Private | `official-documents/{user_id}/filename` |

---

## 9. Not Yet Built (optional, if time allows)

- `internship_records` — day-to-day internship progress/mentor feedback distinct from the final `placements` outcome
- `collaborations` / `collaboration_participants` — institution↔industry engagement (workshops, guest lectures) separate from postings
- `achievements` — extended portfolio beyond projects/certifications
- Per-role differentiation for the 190 non-Agriculture roles in `role_skills` (currently shared per subdomain)
- `level`/`demand_score`/`internship_suitability`/`description` values for the 205 seeded roles

None of these block a working demo — the current schema already covers the full PS26044 core loop end-to-end.



# SIH26044 — Addendum: Resume Intelligence + Grants Update
*(Read alongside `sih26044_FINAL_database_reference.md` — this covers only what's new since that doc.)*

---

## 1. New table: `resume_processing_jobs`

Tracks an async pipeline: student uploads a resume → an AI service parses it → extracted skills eventually feed into `student_skills`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| resume_id | uuid | ⚠️ not null, but no FK target exists yet — see note below |
| student_id | uuid FK → profiles | |
| status | text | pending / processing / completed / completed_with_errors / failed |
| error_message | text | |
| provider | text | e.g. "anthropic", "openai" |
| model | text | e.g. "claude-sonnet-5" |
| storage_path | text | path in the `student-documents` bucket |
| file_name, file_type, file_size | text/bigint | |
| extracted_text | text | raw text pulled from the resume |
| started_at, completed_at | timestamptz | |
| created_at, updated_at | timestamptz | |

**RLS:** students can `select` their own rows (`student_id = auth.uid()`). Only `service_role` can insert/update — meaning **the frontend cannot create or update job rows directly**. Job creation and status updates must go through your backend (an Edge Function or server route using the service role key).

⚠️ **`resume_id` has no companion table.** Either:
- it's meant to be a client-generated idempotency key (fine as-is, just document it as such), or
- you intended a separate `resumes` table (one resume can have multiple processing attempts) and haven't created it yet.

Worth confirming with whoever built this before the frontend starts relying on it.

## 2. Recommended flow (frontend + backend)

1. **Frontend:** student uploads file to Storage bucket `student-documents/{student_id}/resume.pdf`.
2. **Frontend:** calls your backend (not Supabase directly) to kick off processing — e.g. an Edge Function `POST /process-resume` with the storage path.
3. **Backend (service role):** inserts a row into `resume_processing_jobs` with `status = 'pending'`, then updates it to `processing` → `completed`/`failed` as the AI call runs, filling in `extracted_text`, `provider`, `model`.
4. **Backend (service role):** on success, writes parsed skills into `student_skills` (with `source = 'ai_estimated'`) and updates `students.resume_url`.
5. **Frontend:** polls `resume_processing_jobs` (or subscribes via Supabase Realtime) filtered to the student's own `student_id`, watching `status` to show a progress indicator.

## 3. Grants — what changed

Your team added explicit `GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated` and `GRANT ALL ... TO service_role`, plus `ALTER DEFAULT PRIVILEGES` so **future tables inherit this automatically**.

**Why this is still safe:** every table has RLS enabled with specific policies (or none, which means deny-by-default). A blanket table-level `GRANT SELECT` only gets you as far as "Postgres will evaluate row-level policies for you" — it does not bypass them. So a student still can't read another student's `academic_records`, for example, because that table's RLS policy already restricts by `auth.uid()`.

**Practical effect for your frontend team:** you no longer need to worry about "permission denied" errors from missing table grants — if a query fails now, it's an RLS row-policy issue, not a grants issue. Simplifies debugging.

## 4. `student_skills.updated_at`

Added, but had no trigger — the `sih26044_backfill_students.sql` file (just given) adds the missing `trg_student_skills_updated_at` trigger so this column actually updates automatically going forward, consistent with every other table.

## 5. Trigger fix — read this before your team touches `handle_new_user()` again

Two bugs were introduced in the latest version of this function (see main chat response): role was hardcoded to `'student'` instead of reading signup metadata, and `full_name` was dropped from the insert despite being a `NOT NULL` column. `sih26044_fix_handle_new_user.sql` restores both. Apply it before more users sign up, or every institution/company account created in the meantime will be miscategorized as a student.
