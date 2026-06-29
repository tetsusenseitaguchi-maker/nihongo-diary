-- ============================================================
--  Nihongo Diary — Replies to comments and peer corrections
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (uses IF NOT EXISTS / drop-recreate).
--
--  Design: single table with nullable FK to each parent type.
--  Exactly one of comment_id / peer_correction_id must be non-null,
--  enforced by CHECK (num_nonnulls(...) = 1).
--  ON DELETE CASCADE on both FKs: deleting the parent auto-removes replies.
--
--  Privacy rules:
--    - A reply is readable when its parent content is readable
--      (comment on a public diary, or peer correction on a public/own diary)
--    - Any authenticated user can reply to visible public content
--    - Replies are not editable (no UPDATE policy)
--    - Reply author, parent-content author, or diary owner can delete
-- ============================================================

-- ============================================================
-- 1. Table
-- ============================================================
create table if not exists public.replies (
  id                   uuid        primary key default gen_random_uuid(),
  author_id            uuid        not null references public.profiles (id) on delete cascade,
  body                 text        not null,

  -- Exactly one of these must be non-null (enforced by CHECK below).
  -- Both carry ON DELETE CASCADE so parent deletion cleans up replies.
  comment_id           uuid        references public.comments (id)          on delete cascade,
  peer_correction_id   uuid        references public.peer_corrections (id)  on delete cascade,

  created_at           timestamptz not null default now(),

  constraint replies_body_length check (char_length(body) between 1 and 500),
  constraint replies_exactly_one_parent check (
    num_nonnulls(comment_id, peer_correction_id) = 1
  )
);

-- Partial indexes — only index rows where the FK is set, keeping each small.
create index if not exists replies_comment_idx
  on public.replies (comment_id, created_at)
  where comment_id is not null;

create index if not exists replies_peer_correction_idx
  on public.replies (peer_correction_id, created_at)
  where peer_correction_id is not null;

create index if not exists replies_author_idx
  on public.replies (author_id);

-- ============================================================
-- 2. Row Level Security
-- ============================================================
alter table public.replies enable row level security;

-- SELECT: readable when the parent content is readable.
--   comment reply     → parent diary must be public
--   correction reply  → parent diary must be public OR owned by viewer
drop policy if exists "Read replies on public content" on public.replies;
create policy "Read replies on public content"
  on public.replies for select
  using (
    (
      comment_id is not null
      and exists (
        select 1
        from public.comments c
        join public.diary_entries de on de.id = c.diary_entry_id
        where c.id = replies.comment_id
          and de.is_public = true
      )
    )
    or (
      peer_correction_id is not null
      and exists (
        select 1
        from public.peer_corrections pc
        join public.diary_entries de on de.id = pc.diary_entry_id
        where pc.id = replies.peer_correction_id
          and (de.is_public = true or de.user_id = auth.uid())
      )
    )
  );

-- INSERT: authenticated, author_id matches session, parent is public.
drop policy if exists "Insert replies on public content" on public.replies;
create policy "Insert replies on public content"
  on public.replies for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      (
        comment_id is not null
        and exists (
          select 1
          from public.comments c
          join public.diary_entries de on de.id = c.diary_entry_id
          where c.id = comment_id
            and de.is_public = true
        )
      )
      or (
        peer_correction_id is not null
        and exists (
          select 1
          from public.peer_corrections pc
          join public.diary_entries de on de.id = pc.diary_entry_id
          where pc.id = peer_correction_id
            and de.is_public = true
        )
      )
    )
  );

-- DELETE: reply author, OR parent-content author (comment writer / corrector),
--         OR diary owner (for moderation).
drop policy if exists "Delete replies" on public.replies;
create policy "Delete replies"
  on public.replies for delete
  using (
    -- own reply
    auth.uid() = author_id

    -- comment owner can delete replies to their comment
    or (
      comment_id is not null
      and exists (
        select 1 from public.comments c
        where c.id = replies.comment_id
          and c.user_id = auth.uid()
      )
    )

    -- corrector can delete replies to their correction
    or (
      peer_correction_id is not null
      and exists (
        select 1 from public.peer_corrections pc
        where pc.id = replies.peer_correction_id
          and pc.corrector_id = auth.uid()
      )
    )

    -- diary owner can delete any reply that lives under their diary
    or exists (
      select 1 from public.diary_entries de
      where de.user_id = auth.uid()
        and (
          de.id = (
            select c.diary_entry_id from public.comments c
            where c.id = replies.comment_id
          )
          or de.id = (
            select pc.diary_entry_id from public.peer_corrections pc
            where pc.id = replies.peer_correction_id
          )
        )
    )
  );

-- No UPDATE policy — replies are immutable once posted.

-- ============================================================
-- 3. Notification trigger: reply → notify parent-content author
--    Adds a 'reply' row to public.notifications (existing table).
--    metadata carries parent_type and parent_id so the app can
--    deep-link to the right comment / correction.
-- ============================================================
create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id  uuid;
  v_diary_id  uuid;
  v_parent_type text;
  v_parent_id   uuid;
begin
  if NEW.comment_id is not null then
    select c.user_id, c.diary_entry_id
      into v_owner_id, v_diary_id
    from public.comments c
    where c.id = NEW.comment_id;
    v_parent_type := 'comment';
    v_parent_id   := NEW.comment_id;

  elsif NEW.peer_correction_id is not null then
    select pc.corrector_id, pc.diary_entry_id
      into v_owner_id, v_diary_id
    from public.peer_corrections pc
    where pc.id = NEW.peer_correction_id;
    v_parent_type := 'peer_correction';
    v_parent_id   := NEW.peer_correction_id;
  end if;

  -- No self-notification, skip if parent was deleted
  if v_owner_id is null or v_owner_id = NEW.author_id then
    return NEW;
  end if;

  insert into public.notifications (user_id, type, actor_id, diary_entry_id, metadata)
  values (
    v_owner_id,
    'reply',
    NEW.author_id,
    v_diary_id,
    jsonb_build_object(
      'reply_id',    NEW.id,
      'parent_type', v_parent_type,
      'parent_id',   v_parent_id
    )
  );

  return NEW;
end;
$$;

drop trigger if exists on_new_reply on public.replies;
create trigger on_new_reply
  after insert on public.replies
  for each row execute function public.notify_on_reply();

notify pgrst, 'reload schema';
