-- ============================================================
--  Nihongo Diary — Furigana for Original Text
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  Adds a column to hold an AI-generated, ruby-tagged (<ruby>..<rt>..</rt></ruby>)
--  copy of the learner's original diary text, so furigana can be shown on it
--  the same way it already is for natural_japanese. original_text itself is
--  left untouched (plain text) since other features — e.g. peer-correction
--  range selection — index into it by raw character offset.
-- ============================================================

alter table public.diary_entries
  add column if not exists original_text_ruby text;
