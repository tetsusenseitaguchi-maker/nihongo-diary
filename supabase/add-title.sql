-- ============================================================
--  Nihongo Diary — Add optional title to diary entries
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (IF NOT EXISTS).
--
--  Existing rows get title = null (displayed as before: original_text).
-- ============================================================

alter table public.diary_entries
  add column if not exists title text;

notify pgrst, 'reload schema';
