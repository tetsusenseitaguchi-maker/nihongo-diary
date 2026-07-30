-- ============================================================
--  Nihongo Diary — Discovery filters: author level & country
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  ALREADY APPLIED. Recorded here as the second revision of the view
--  first created in supabase/discovery.sql.
--
--  ADDITIVE ONLY. Two columns are appended to discovery_entries:
--    - the nine existing columns keep their names, types and order
--    - the WHERE clause is untouched, so the same rows come back
--    - no table, policy, trigger or function is modified
--
--  The Discovery tab was already live when this ran. It selects its
--  columns by name, so columns it does not ask for cannot affect it.
--
--  create or replace, not drop + create: replace keeps the same
--  object, so the grant and the comment survive and no reader sees a
--  moment where the view is missing. The price is that it can only
--  append — see the rollback note at the bottom.
--
--  Not touched: profiles, plan, billing_source, correction_count,
--  translation_count, try_use_correction(), 既存トリガー。
-- ============================================================

create or replace view public.discovery_entries
with (security_barrier = true) as
select
  -- ── existing columns, unchanged and in the original order ──────────
  -- Postgres refuses a replace that renames, retypes or reorders these,
  -- so this block is load-bearing rather than decorative.
  de.id,
  de.user_id,
  de.diary_date,
  de.title,
  de.tags,
  de.original_text,
  de.corrected_japanese,
  de.seeking_peer_correction,
  de.created_at,

  -- ── appended ───────────────────────────────────────────────────────
  -- author_* rather than level/country because diary_entries has a
  -- level column of its own (the correction level), and a future
  -- revision that wanted both would have no way to name them apart.
  --
  -- No new exposure: profiles is readable by everyone under "Public
  -- profiles are viewable by everyone", and /feed already shows both
  -- on its suggestion list.
  p.level   as author_level,
  p.country as author_country
from public.diary_entries de
left join public.discovery_settings ds
  on ds.user_id = de.user_id
-- LEFT, deliberately. An inner join would drop any diary whose author
-- has no profiles row and quietly change what the live tab returns.
-- handle_new_user() should make that impossible; joining this way means
-- it cannot matter either way. profiles.id is the primary key, so the
-- join can no more duplicate a row than it can drop one.
left join public.profiles p
  on p.id = de.user_id
where de.is_public = true
  and coalesce(ds.opted_out, false) = false;

comment on view public.discovery_entries is
  'Public diaries eligible for the Discovery tab: is_public and the author '
  'has not opted out, with the author''s level and country appended for '
  'filtering. Intentionally not security_invoker — discovery_settings is '
  'owner-only, so the exclusion has to be resolved here. Blocks are NOT '
  'applied; callers filter those, as they do everywhere else.';

-- Idempotent; the grant survives a replace, but re-stating it costs nothing.
grant select on public.discovery_entries to authenticated;

-- Required. Without it PostgREST keeps its old column list and the two
-- new columns are invisible to the API — the filters would 400 while
-- the tab itself kept working.
notify pgrst, 'reload schema';


-- ------------------------------------------------------------
--  VERIFY
-- ------------------------------------------------------------

-- 1..9 in the original order, 10 and 11 appended.
-- select ordinal_position, column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'discovery_entries'
--  order by ordinal_position;

-- The two numbers must match: proof the profiles join dropped nothing.
-- select
--   (select count(*) from public.discovery_entries) as view_rows,
--   (select count(*)
--      from public.diary_entries de
--      left join public.discovery_settings ds on ds.user_id = de.user_id
--     where de.is_public = true
--       and coalesce(ds.opted_out, false) = false) as expected_rows;

-- security_barrier kept, security_invoker still absent.
-- select reloptions from pg_class
--  where oid = 'public.discovery_entries'::regclass;   -- {security_barrier=true}


-- ============================================================
--  ROLLBACK
--
--  create or replace cannot drop a column, so reverting needs
--  drop + create. Wrap it in a transaction: other sessions keep
--  reading the old definition until commit, so there is no window
--  where the view is missing.
--
--    begin;
--    drop view if exists public.discovery_entries;
--    create view public.discovery_entries
--    with (security_barrier = true) as
--    select de.id, de.user_id, de.diary_date, de.title, de.tags,
--           de.original_text, de.corrected_japanese,
--           de.seeking_peer_correction, de.created_at
--      from public.diary_entries de
--      left join public.discovery_settings ds on ds.user_id = de.user_id
--     where de.is_public = true
--       and coalesce(ds.opted_out, false) = false;
--    grant select on public.discovery_entries to authenticated;
--    commit;
--    notify pgrst, 'reload schema';
--
--  Rolling back would break the filters, which select author_level and
--  author_country by name. Nothing else reads them.
-- ============================================================
