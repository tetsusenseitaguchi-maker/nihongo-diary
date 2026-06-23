-- ============================================================
--  Nihongo Diary — profiles table + Row Level Security
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Table
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  display_name text,
  avatar_url  text,
  level       text,
  bio         text,
  created_at  timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. Policies
--    Anyone can read public profile data
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

--    A user can update only their own profile
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

--    A user can insert only their own profile
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- 4. Auto-create a profile row whenever a new auth user signs up.
--    SECURITY DEFINER lets the trigger insert past RLS, so this works
--    even when email confirmation is enabled (no session yet at signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
--  diary_entries — saved diaries + their AI correction
-- ============================================================

create table if not exists public.diary_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  diary_date         date not null,
  original_text      text not null,
  corrected_japanese text,
  natural_japanese   text,
  english_explanation text,
  key_mistakes       jsonb,
  useful_vocabulary  jsonb,
  practice_sentence  text,
  level              text,
  correction_style   text,
  is_public          boolean default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists diary_entries_user_date_idx
  on public.diary_entries (user_id, diary_date desc);

alter table public.diary_entries enable row level security;

-- Select own
drop policy if exists "Users can read their own diary entries" on public.diary_entries;
create policy "Users can read their own diary entries"
  on public.diary_entries for select
  using (auth.uid() = user_id);

-- Insert own
drop policy if exists "Users can insert their own diary entries" on public.diary_entries;
create policy "Users can insert their own diary entries"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

-- Update own
drop policy if exists "Users can update their own diary entries" on public.diary_entries;
create policy "Users can update their own diary entries"
  on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete own
drop policy if exists "Users can delete their own diary entries" on public.diary_entries;
create policy "Users can delete their own diary entries"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diary_entries_set_updated_at on public.diary_entries;
create trigger diary_entries_set_updated_at
  before update on public.diary_entries
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
--  Add correction_note (the "not wrong, but more natural" note)
--  Safe to run on an existing diary_entries table.
-- ------------------------------------------------------------
alter table public.diary_entries
  add column if not exists correction_note text;


-- ============================================================
--  Avatar photos — Supabase Storage bucket + policies
--  Users upload to:  avatars/<their-user-id>/avatar.<ext>
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
--  Reload the PostgREST schema cache so the API sees the
--  tables/columns immediately (fixes "Could not find the
--  table ... in the schema cache").
-- ============================================================
notify pgrst, 'reload schema';
