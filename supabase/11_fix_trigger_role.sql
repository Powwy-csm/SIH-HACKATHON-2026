-- =====================================================================
-- BridgeX — Fix: handle_new_user trigger should respect role metadata
-- Run this in the Supabase SQL Editor.
--
-- Problem: The original trigger hardcoded role='student' for every new
--          user, which means industry/institution users created via
--          Supabase Auth all got role='student' in the profiles table.
--
-- Fix: Read role from raw_user_meta_data if provided, default 'student'.
-- =====================================================================

-- 1. Replace the trigger function to respect signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    _role text;
begin
    -- Read role from signup metadata; fall back to 'student'
    _role := coalesce(
        new.raw_user_meta_data ->> 'role',
        new.raw_app_meta_data ->> 'role',
        'student'
    );

    insert into public.profiles (id, email, role)
    values (new.id, new.email, _role)
    on conflict (id) do nothing;

    -- Only create a students row for student-role users
    if _role = 'student' then
        insert into public.students (id, is_placed)
        values (new.id, false)
        on conflict (id) do nothing;
    end if;

    return new;
end;
$$;

-- 2. Fix existing industry users whose profiles.role is wrong.
--    Match users whose email domain or user_metadata suggests industry role
--    but profiles.role is still 'student'.
--    
--    You can also manually run:
--      UPDATE profiles SET role = 'industry' WHERE email = 'abc@company.com';
--
-- Auto-fix: sync profiles.role from auth.users metadata for any mismatch
update public.profiles p
set role = coalesce(
    u.raw_user_meta_data ->> 'role',
    u.raw_app_meta_data ->> 'role',
    p.role
)
from auth.users u
where p.id = u.id
  and (
    u.raw_user_meta_data ->> 'role' is not null
    or u.raw_app_meta_data ->> 'role' is not null
  )
  and p.role != coalesce(
    u.raw_user_meta_data ->> 'role',
    u.raw_app_meta_data ->> 'role',
    p.role
  );
