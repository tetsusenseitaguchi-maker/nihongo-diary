-- Add JLPT word levels and alternative word suggestions to diary_entries.
-- Run this once on the existing database (idempotent — safe to re-run).
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS jlpt_words      jsonb,
  ADD COLUMN IF NOT EXISTS alternative_words jsonb;
