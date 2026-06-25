-- ============================================================
--  Nihongo Diary — Comments on public diaries
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (uses IF NOT EXISTS / drop-recreate).
--
--  Privacy rules:
--    - Anyone (authenticated) can read comments on PUBLIC diaries
--    - Authenticated users can comment on PUBLIC diaries only
--    - Users can only delete their own comments
--    - Private diary → no comments readable or writable
-- ============================================================

-- user_id references profiles (not auth.users directly) so PostgREST
-- can auto-join the profiles table in select queries.
create table if not exists public.comments (
  id              uuid default gen_random_uuid() primary key,
  diary_entry_id  uuid not null references public.diary_entries (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  body            text not null,
  created_at      timestamptz default now() not null,
  constraint body_length check (char_length(body) between 1 and 500)
);

create index if not exists comments_diary_idx on public.comments (diary_entry_id, created_at);
create index if not exists comments_user_idx  on public.comments (user_id);

alter table public.comments enable row level security;

-- Read: only if the diary is public
drop policy if exists "Read comments on public diaries" on public.comments;
create policy "Read comments on public diaries"
  on public.comments for select
  using (
    exists (
      select 1 from public.diary_entries de
      where de.id = comments.diary_entry_id
        and de.is_public = true
    )
  );

-- Insert: authenticated, commenting on a public diary, with correct user_id
drop policy if exists "Insert comments on public diaries" on public.comments;
create policy "Insert comments on public diaries"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.diary_entries de
      where de.id = diary_entry_id
        and de.is_public = true
    )
  );

-- Delete: own comments only
drop policy if exists "Delete own comments" on public.comments;
create policy "Delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
