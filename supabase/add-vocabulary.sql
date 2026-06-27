-- ============================================================
--  Nihongo Diary — My Vocabulary (単語帳)
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================

create table if not exists public.vocabulary_entries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  word                text not null,
  reading             text not null,
  jlpt_level          text,
  meaning             text not null,
  example_jp_ruby     text,
  example_translation text,
  practice_question   text,
  practice_answer     text,
  created_at          timestamptz default now()
);

alter table public.vocabulary_entries enable row level security;

-- Users can only read/write/delete their own entries.
create policy "vocab_owner" on public.vocabulary_entries
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Prevent saving the exact same word (by string) twice per user.
create unique index if not exists idx_vocab_user_word
  on public.vocabulary_entries(user_id, word);

-- Fast lookup for the list page (most recent first).
create index if not exists idx_vocab_user_created
  on public.vocabulary_entries(user_id, created_at desc);

notify pgrst, 'reload schema';
