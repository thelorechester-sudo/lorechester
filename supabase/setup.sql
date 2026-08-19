-- Run this ONCE in the Supabase SQL Editor, AFTER `npm run db:push`.
-- Idempotent: safe to re-run.

-- ===========================================================================
-- 1. Auto-create a profile row for every new auth user
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Supabase exposes public-schema functions over /rest/v1/rpc/, and this one is
-- SECURITY DEFINER (runs as the owner, bypassing RLS) and writes to profiles.
-- It is a trigger function and must never be callable directly. The trigger
-- still fires — it runs as the table owner, not as the API role.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Backfill any users that already exist.
insert into public.profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- ===========================================================================
-- 2. Lock PostgREST out of every table
-- ===========================================================================
-- The anon key is public and Supabase exposes `public` tables over PostgREST.
-- Without RLS, anyone with the key could read the orders table. The app does
-- not use PostgREST at all — it talks to Postgres directly via Drizzle as the
-- `postgres` role, which bypasses RLS — so enabling RLS with NO policies
-- closes the API while leaving the app untouched.
-- Enumerated from the catalogue rather than listed by hand. A hardcoded list
-- silently omits the next table someone adds, and an omitted table is
-- world-readable through the public anon key — the failure is invisible until
-- someone goes looking. Enabling RLS with no policies is safe for every table
-- here by definition: the app connects as `postgres`, which bypasses RLS.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- The app reads `profiles` via Drizzle (the `postgres` role), which bypasses
-- RLS entirely, so section 2 above deliberately leaves it with zero policies.
-- But the storage policy below checks admin status with a subquery that runs
-- as the `authenticated` role, and that role could not read `profiles` at
-- all — not even its own row — so the check always saw zero rows and every
-- upload failed regardless of actual role. Scoped to the caller's own row
-- only: this does not reopen `profiles` to PostgREST generally.
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

-- ===========================================================================
-- 3. Media bucket for product / article / lookbook images
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media_admin_write" on storage.objects;
create policy "media_admin_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

-- ===========================================================================
-- 4. Make yourself an admin
-- ===========================================================================
-- Sign up through /admin/login first, then run:
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
