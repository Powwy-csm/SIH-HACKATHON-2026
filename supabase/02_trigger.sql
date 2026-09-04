-- =====================================================================
-- BridgeX Student AI — Auth Provisioning Trigger (BLOCK 2 of 3)
-- Run this SECOND, after 01_schema.sql, in the Supabase SQL Editor.
--
-- Makes plain supabase.auth.signUp() (already used by the existing
-- frontend) automatically produce a working student:
--   auth.users.id -> profiles (role='student') -> students (is_placed=false)
--
-- SECURITY DEFINER so it can write to public.profiles / public.students
-- even though the new user has no session yet when the trigger fires.
-- The frontend never needs the service role key for this.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'student')
    on conflict (id) do nothing;

    insert into public.students (id, is_placed)
    values (new.id, false)
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();
