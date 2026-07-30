-- ============================================================
--  Nihongo Diary — diary_places becomes owner-only (phase 3 of 3)
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  ALREADY APPLIED. Recorded here so that the absence of the
--  "read_public_diary_places" policy has an explanation next to
--  diary-places.sql, which is where that policy is still declared.
--
--  RUN THE STATEMENTS ONE AT A TIME.
--    The first version of this script put the drop and its
--    verification in one block. The SQL Editor runs a script as a
--    single transaction, so when the verification raised, the drop
--    was rolled back with it — the policy was still there and the
--    only visible sign was a red error. Separate statements cannot
--    undo each other.
--
--  PREREQUISITES, both of which must already be true:
--    1. supabase/diary-places-blur.sql has been run (the view exists)
--    2. the application reading that view is deployed
--  Reversing that order blanks the friend map and the diary detail
--  map for as long as it takes to deploy.
--
--  What this closes:
--    Exact lat/lng become the author's alone. Everyone else reads
--    diary_places_public and gets coordinates rounded to ~22km. The
--    UI stopped showing exact coordinates to other people in phase 2;
--    this is what stops PostgREST from handing them over directly,
--    which the UI change on its own could not do.
--
--  Not touched: profiles, plan, billing_source, correction_count,
--  translation_count, try_use_correction(), 既存トリガー,
--  diary_entries / comments / peer_corrections の各ポリシー。
-- ============================================================


-- ------------------------------------------------------------
-- STEP 1 — pre-flight. Run alone. Nothing is modified here.
--
-- The one way this change fails is silent: the view is not
-- security_invoker, so it reads the base table as its owner. If that
-- owner is not the table's owner, or the table has FORCE ROW LEVEL
-- SECURITY, the view is subject to RLS too — and dropping the policy
-- below takes the view down with it, leaving every map empty. While
-- the policy still exists that is indistinguishable from working, so
-- it has to be checked before, not after.
-- ------------------------------------------------------------
do $$
declare
  v_table_owner text;
  v_view_owner  text;
  v_force_rls   boolean;
  v_view_rows   bigint;
begin
  if to_regclass('public.diary_places_public') is null then
    raise exception
      'diary_places_public does not exist. Run supabase/diary-places-blur.sql (phase 1) first.';
  end if;

  select pg_get_userbyid(relowner), relforcerowsecurity
    into v_table_owner, v_force_rls
    from pg_class where oid = 'public.diary_places'::regclass;

  select pg_get_userbyid(relowner)
    into v_view_owner
    from pg_class where oid = 'public.diary_places_public'::regclass;

  if v_force_rls then
    raise exception
      'diary_places has FORCE ROW LEVEL SECURITY. The view owner would not bypass RLS, so dropping the read policy would blank every map. Aborting.';
  end if;

  if v_view_owner is distinct from v_table_owner then
    raise exception
      'Owner mismatch: view is owned by %, table by %. The view may stop returning rows once the read policy is dropped. Aborting.',
      v_view_owner, v_table_owner;
  end if;

  select count(*) into v_view_rows from public.diary_places_public;
  if v_view_rows = 0 then
    raise warning
      'diary_places_public currently returns 0 rows. If public diaries with locations exist, investigate before dropping the policy.';
  end if;

  raise notice 'Pre-flight OK. owner=%, view rows=%', v_table_owner, v_view_rows;
end
$$;


-- ------------------------------------------------------------
-- STEP 2 — the change. Run alone.
--
-- owner_all is left in place and is the only policy that remains. It
-- is FOR ALL, so writing a pin, editing one and deleting one all keep
-- working; /places reads the author's own pins through it, and the
-- diary detail page reads it for the author and the view for everyone
-- else.
-- ------------------------------------------------------------
drop policy if exists "read_public_diary_places" on public.diary_places;


-- ------------------------------------------------------------
-- STEP 3 — let PostgREST see the new state. Run alone.
-- ------------------------------------------------------------
notify pgrst, 'reload schema';


-- ------------------------------------------------------------
-- STEP 4 — verify. Run alone. Expected results in the comments.
-- ------------------------------------------------------------

-- Exactly one row: owner_all (ALL)
-- select policyname, cmd from pg_policies
--  where schemaname = 'public' and tablename = 'diary_places'
--  order by policyname;

-- anon must no longer reach the base table, and must still reach the
-- view. If the second number is 0, roll back immediately — that is
-- the owner-mismatch case step 1 is meant to catch.
-- begin;
--   set local role anon;
--   select count(*) as anon_sees_base from public.diary_places;        -- expect 0
--   select count(*) as anon_sees_view from public.diary_places_public; -- expect > 0
-- rollback;

-- If anon_sees_base equals the total row count rather than 0, the role
-- switch did not take effect and the test says nothing. Compare
-- against: select count(*) from public.diary_places;


-- ============================================================
--  ROLLBACK — restores the policy exactly as diary-places.sql
--  declares it. No data is involved; a policy is a rule, and the
--  rows were never touched.
--
--    create policy "read_public_diary_places" on public.diary_places
--      for select using (
--        exists (
--          select 1 from public.diary_entries de
--          where de.id = diary_entry_id
--            and de.is_public = true
--        )
--      );
--    notify pgrst, 'reload schema';
--
--  Rolling back does not break the application: phase 2 reads the view
--  for everyone but the author either way. What comes back is the
--  exposure — exact coordinates readable through PostgREST — not any
--  lost functionality.
-- ============================================================
