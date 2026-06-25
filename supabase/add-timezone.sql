-- ============================================================
--  Nihongo Diary — per-user timezone column on profiles
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
-- ============================================================

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

notify pgrst, 'reload schema';
