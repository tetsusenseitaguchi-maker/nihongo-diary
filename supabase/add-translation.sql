-- Per-language translation cache on diary entries.
-- Keys are BCP-47 language codes (en, es, fr, zh, ko, pt, de, it).
-- Values are the translated text. Set once per language, never cleared.
alter table public.diary_entries
  add column if not exists translations jsonb not null default '{}';
