-- ============================================================
--  Nihongo Diary — Emoji reactions on COMMENTS
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (IF NOT EXISTS / drop-recreate).
--  One reaction per user per comment (unique user_id, comment_id):
--  re-press a different emoji to change, same emoji to remove.
-- ============================================================

create table if not exists public.comment_reactions (
  id            uuid primary key default gen_random_uuid(),
  comment_id    uuid not null references public.comments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  reaction_type text not null check (reaction_type in ('thumbsup','heart','joy','tada')),
  created_at    timestamptz default now() not null,
  unique (user_id, comment_id)          -- one reaction per user per comment
);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

-- Read: mirror `reactions` (rows carry no content; comment visibility
-- is already gated by comments RLS). Readable by authenticated users.
drop policy if exists "Comment reactions are readable" on public.comment_reactions;
create policy "Comment reactions are readable"
  on public.comment_reactions for select
  to authenticated
  using (true);

-- Insert: own rows only
drop policy if exists "Users add own comment reactions" on public.comment_reactions;
create policy "Users add own comment reactions"
  on public.comment_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update: own rows only (needed for upsert = change emoji)
drop policy if exists "Users update own comment reactions" on public.comment_reactions;
create policy "Users update own comment reactions"
  on public.comment_reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: own rows only
drop policy if exists "Users delete own comment reactions" on public.comment_reactions;
create policy "Users delete own comment reactions"
  on public.comment_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
