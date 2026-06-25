-- ============================================================
--  Nihongo Diary — Add tags array to diary entries
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS).
--
--  Existing rows get tags = '{}' (empty array — displayed as "no tags").
--  GIN index enables efficient array-contains queries if needed later.
-- ============================================================

alter table public.diary_entries
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_diary_entries_tags
  on public.diary_entries using gin(tags);

notify pgrst, 'reload schema';
