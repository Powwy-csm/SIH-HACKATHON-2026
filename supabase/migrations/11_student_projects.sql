create table if not exists public.student_projects (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade,
    title text not null,
    description text,
    start_date date,
    end_date date,
    tags text[] default '{}',
    project_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.student_projects enable row level security;

grant select, insert, update, delete
on public.student_projects
to authenticated;

drop policy if exists "Students can view own projects"
on public.student_projects;

create policy "Students can view own projects"
on public.student_projects
for select
to authenticated
using (student_id = auth.uid());

drop policy if exists "Students can insert own projects"
on public.student_projects;

create policy "Students can insert own projects"
on public.student_projects
for insert
to authenticated
with check (student_id = auth.uid());

drop policy if exists "Students can update own projects"
on public.student_projects;

create policy "Students can update own projects"
on public.student_projects
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists "Students can delete own projects"
on public.student_projects;

create policy "Students can delete own projects"
on public.student_projects
for delete
to authenticated
using (student_id = auth.uid());