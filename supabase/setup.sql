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
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'product_images', 'variants', 'collections',
    'product_collections', 'orders', 'order_items', 'discounts',
    'articles', 'showcases', 'waitlist', 'profiles'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

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
