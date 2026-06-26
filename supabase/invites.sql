-- ============================================================
--  Nihongo Diary — Friend Invite Links
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── 1. invite_code column on profiles ─────────────────────
-- A short unique code that becomes the invite URL slug.
alter table public.profiles
  add column if not exists invite_code text;

-- Backfill existing users (deterministic — re-running gives the same code).
update public.profiles
  set invite_code = lower(substring(md5(id::text || 'nihongo-invite-v1'), 1, 10))
  where invite_code is null;

-- Unique index (partial — handles the null case cleanly).
create unique index if not exists profiles_invite_code_idx
  on public.profiles (invite_code)
  where invite_code is not null;

-- Default for new users (auto-generated on INSERT).
alter table public.profiles
  alter column invite_code set default lower(substring(md5(gen_random_uuid()::text), 1, 10));

-- ── 2. invite_uses — tracking table ───────────────────────
-- Records who invited whom (one row per unique pair).
create table if not exists public.invite_uses (
  id          uuid primary key default gen_random_uuid(),
  invite_code text not null,
  inviter_id  uuid not null references public.profiles (id) on delete cascade,
  invitee_id  uuid not null references public.profiles (id) on delete cascade,
  used_at     timestamptz not null default now(),
  unique (inviter_id, invitee_id)  -- one record per inviter→invitee pair
);

create index if not exists invite_uses_inviter_idx on public.invite_uses (inviter_id);
create index if not exists invite_uses_invitee_idx on public.invite_uses (invitee_id);

alter table public.invite_uses enable row level security;

drop policy if exists "Users see own invite uses" on public.invite_uses;
create policy "Users see own invite uses"
  on public.invite_uses for select
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- ── 3. apply_invite() — atomic mutual-follow function ─────
-- Returns: 'success' | 'already_connected' | 'self' | 'not_found' | 'unauthorized'
--
-- SECURITY DEFINER so it can insert follows in both directions
-- regardless of which user is calling (RLS only allows follower_id = auth.uid()).
create or replace function public.apply_invite(p_inviter_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter_id uuid;
  v_invitee_id uuid;
begin
  v_invitee_id := auth.uid();
  if v_invitee_id is null then return 'unauthorized'; end if;

  -- Resolve invite code → inviter
  select id into v_inviter_id
    from public.profiles
   where invite_code = p_inviter_code;
  if not found then return 'not_found'; end if;

  -- Self-invite guard (also enforced by follows CHECK constraint)
  if v_inviter_id = v_invitee_id then return 'self'; end if;

  -- Already mutually following?
  if exists (select 1 from public.follows
              where follower_id = v_invitee_id and following_id = v_inviter_id)
     and exists (select 1 from public.follows
                  where follower_id = v_inviter_id and following_id = v_invitee_id)
  then return 'already_connected'; end if;

  -- Mutual follow (idempotent — ON CONFLICT DO NOTHING handles duplicates)
  insert into public.follows (follower_id, following_id)
    values (v_invitee_id, v_inviter_id)
    on conflict do nothing;

  insert into public.follows (follower_id, following_id)
    values (v_inviter_id, v_invitee_id)
    on conflict do nothing;

  -- Record for analytics / "who invited whom"
  insert into public.invite_uses (invite_code, inviter_id, invitee_id)
    values (p_inviter_code, v_inviter_id, v_invitee_id)
    on conflict do nothing;

  return 'success';
end;
$$;

grant execute on function public.apply_invite(text) to authenticated;

-- ── 4. Reload PostgREST schema cache ──────────────────────
notify pgrst, 'reload schema';

-- ============================================================
--  VERIFY (optional — check in SQL Editor after running)
-- ============================================================
-- SELECT id, username, invite_code FROM public.profiles LIMIT 5;
-- SELECT * FROM public.invite_uses LIMIT 5;
-- ============================================================
