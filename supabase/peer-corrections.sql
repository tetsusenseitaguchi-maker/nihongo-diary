-- ============================================================
--  Nihongo Diary — Peer corrections (HelloTalk-style)
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  A peer correction targets a specific text range in a diary's
--  original_text using character offsets.  The original_excerpt
--  column is a snapshot of the selected text used for validation.
--
--  corrector_level is snapshotted from profiles.level at insert
--  time so historical corrections show the level the corrector
--  had when they wrote the correction, even if they change it later.
--
--  Privacy rules (mirrors comments.sql):
--    - Authenticated users can read peer corrections on PUBLIC diaries
--      (the diary owner can also read corrections on their own diary
--       regardless of is_public, so they can moderate)
--    - Authenticated users can correct any PUBLIC diary that is NOT
--      their own
--    - Correctors and diary owners can delete; only correctors can edit
-- ============================================================

create table if not exists public.peer_corrections (
  id               uuid primary key default gen_random_uuid(),

  -- which diary
  diary_entry_id   uuid not null
                     references public.diary_entries (id) on delete cascade,

  -- who corrected
  corrector_id     uuid not null
                     references public.profiles (id) on delete cascade,

  -- text range inside original_text (0-based, end is exclusive)
  start_offset     int  not null,
  end_offset       int  not null,
  original_excerpt text not null,   -- snapshot of the selected slice for display / validation

  -- the correction itself
  corrected_text   text not null,
  comment          text,             -- optional explanation

  -- corrector's level at the time of writing (snapshot from profiles.level)
  corrector_level  text,             -- 'N5'|'N4'|'N3'|'N2'|'N1'|'Natural'|NULL

  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null,

  constraint peer_corrections_valid_range check (
    start_offset >= 0 and end_offset > start_offset
  ),
  constraint peer_corrections_corrected_nonempty check (
    char_length(corrected_text) between 1 and 500
  ),
  constraint peer_corrections_comment_max check (
    comment is null or char_length(comment) <= 500
  )
);

create index if not exists peer_corrections_diary_idx
  on public.peer_corrections (diary_entry_id, created_at);
create index if not exists peer_corrections_corrector_idx
  on public.peer_corrections (corrector_id);

alter table public.peer_corrections enable row level security;

-- SELECT: public diaries, or own diary regardless of is_public
drop policy if exists "Read peer corrections" on public.peer_corrections;
create policy "Read peer corrections"
  on public.peer_corrections for select
  using (
    exists (
      select 1 from public.diary_entries de
      where de.id = peer_corrections.diary_entry_id
        and (de.is_public = true or de.user_id = auth.uid())
    )
  );

-- INSERT: authenticated, public diary, not own diary
drop policy if exists "Insert peer corrections" on public.peer_corrections;
create policy "Insert peer corrections"
  on public.peer_corrections for insert
  to authenticated
  with check (
    auth.uid() = corrector_id
    and exists (
      select 1 from public.diary_entries de
      where de.id = diary_entry_id
        and de.is_public = true
        and de.user_id <> auth.uid()
    )
  );

-- UPDATE: own corrections only
drop policy if exists "Update own peer corrections" on public.peer_corrections;
create policy "Update own peer corrections"
  on public.peer_corrections for update
  using  (auth.uid() = corrector_id)
  with check (auth.uid() = corrector_id);

-- DELETE: corrector or diary owner can remove
drop policy if exists "Delete peer corrections" on public.peer_corrections;
create policy "Delete peer corrections"
  on public.peer_corrections for delete
  using (
    auth.uid() = corrector_id
    or exists (
      select 1 from public.diary_entries de
      where de.id = peer_corrections.diary_entry_id
        and de.user_id = auth.uid()
    )
  );

-- updated_at trigger (reuses the function created in schema.sql)
drop trigger if exists peer_corrections_set_updated_at on public.peer_corrections;
create trigger peer_corrections_set_updated_at
  before update on public.peer_corrections
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
