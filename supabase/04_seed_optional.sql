-- =====================================================================
-- BridgeX Student AI — OPTIONAL Demo Seed Data
-- Run this ONLY if you want sample postings/skills to demo opportunity
-- matching, skill gap analysis, and simulation before real Industry-portal
-- data exists. Safe to skip entirely -- the schema and app work without it
-- (dashboard will just show "analysis_required" until a student has
-- skills and there are open postings to match against).
-- =====================================================================

insert into public.domains (name) values
    ('Computer Science'),
    ('Electronics'),
    ('Mechanical')
on conflict (name) do nothing;

insert into public.skill_categories (name) values
    ('Programming Languages'),
    ('Cloud & DevOps'),
    ('Data & Analytics')
on conflict (name) do nothing;

insert into public.skills (name, category_id)
select v.name, c.id
from (values
    ('Python', 'Programming Languages'),
    ('SQL', 'Programming Languages'),
    ('Cloud Computing', 'Cloud & DevOps'),
    ('Data Analysis', 'Data & Analytics')
) as v(name, category_name)
join public.skill_categories c on c.name = v.category_name
on conflict (name) do nothing;

insert into public.companies (name) values
    ('Nimbus Analytics'),
    ('Vertex Systems')
on conflict do nothing;

insert into public.postings (title, company_id, domain_id, type, status)
select 'Backend Developer Intern', co.id, d.id, 'internship', 'open'
from public.companies co, public.domains d
where co.name = 'Nimbus Analytics' and d.name = 'Computer Science'
limit 1;

insert into public.postings (title, company_id, domain_id, type, status)
select 'Data Analytics Intern', co.id, d.id, 'internship', 'closed'
from public.companies co, public.domains d
where co.name = 'Nimbus Analytics' and d.name = 'Computer Science'
limit 1;

insert into public.postings (title, company_id, domain_id, type, status)
select 'Cloud Engineer Placement', co.id, d.id, 'placement', 'open'
from public.companies co, public.domains d
where co.name = 'Vertex Systems' and d.name = 'Computer Science'
limit 1;

-- Required skills for the two OPEN postings above.
insert into public.posting_required_skills (posting_id, skill_id, required_level, importance)
select p.id, s.id, req.required_level, req.importance
from public.postings p
join public.companies co on co.id = p.company_id
cross join lateral (
    values
        ('Python', 80, 'high'),
        ('SQL', 70, 'medium'),
        ('Cloud Computing', 75, 'high')
) as req(skill_name, required_level, importance)
join public.skills s on s.name = req.skill_name
where p.title = 'Backend Developer Intern' and co.name = 'Nimbus Analytics';

insert into public.posting_required_skills (posting_id, skill_id, required_level, importance)
select p.id, s.id, req.required_level, req.importance
from public.postings p
join public.companies co on co.id = p.company_id
cross join lateral (
    values
        ('Cloud Computing', 85, 'high'),
        ('Python', 60, 'medium')
) as req(skill_name, required_level, importance)
join public.skills s on s.name = req.skill_name
where p.title = 'Cloud Engineer Placement' and co.name = 'Vertex Systems';
