-- ============================================================
--  Nihongo Diary — blurred, read-only view of public diary places
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  Why this exists:
--    /places already blurs friends' pins to ~22km before sending them
--    to the client (lib/geo.ts blurCoord). The diary detail page did
--    not — it read diary_places directly and handed exact lat/lng to
--    the map for anyone who could open a public diary. Worse, the RLS
--    policy "read_public_diary_places" makes those exact coordinates
--    readable straight from PostgREST, so fixing only the page would
--    have left the data reachable.
--
--    RLS can allow or deny rows; it cannot round a value. So the fix
--    is a view that returns coordinates already blurred, and a base
--    table that only its owner can read.
--
--  THIS SCRIPT IS ADDITIVE ONLY — it is step 1 of 3.
--    1. (this file) create the view. No policy is created, altered or
--       dropped; no table, column, trigger or function is touched.
--       Existing behaviour is unchanged.
--    2. deploy the application reading from this view.
--    3. drop the "read_public_diary_places" policy on diary_places, in
--       a script of its own. NOT DONE YET. Running it before step 2 is
--       deployed blanks the friend map and the diary detail map.
--
--  Not touched, and not reachable from here: profiles, plan,
--  billing_source, correction_count, translation_count,
--  try_use_correction(), or any existing trigger.
-- ============================================================

-- ------------------------------------------------------------
--  security_invoker is deliberately NOT set.
--
--  Without it the view runs with its owner's privileges, so it can
--  still read diary_places after step 3 removes the policy that lets
--  everyone else read that table. That is the entire point: the base
--  table becomes owner-only, and this view becomes the one way anybody
--  else sees a location — blurred, by construction.
--
--  With security_invoker = on the view would be evaluated as the
--  caller, step 3 would make it return zero rows for every viewer but
--  the owner, and the friend map would go blank.
--
--  Supabase's database linter flags this as "security_definer_view".
--  The warning is expected and is being accepted knowingly. The access
--  rule has not been dropped, it has moved into the view body: the
--  WHERE clause below is what restricts this to public diaries, and it
--  cannot be bypassed by the caller because the caller cannot alter
--  the view. Reviewers: if you ever add a column or relax that WHERE,
--  you are widening a privilege boundary, not editing a query.
--
--  security_barrier = true stops a cheap user-supplied function from
--  being evaluated before the WHERE and observing rows the view is
--  meant to hide. Equality and IN on uuid stay leakproof, so the
--  filters the app actually sends are still pushed down.
-- ------------------------------------------------------------

create or replace view public.diary_places_public
with (security_barrier = true) as
select
  dp.id,
  dp.diary_entry_id,
  dp.user_id,

  -- place_name is passed through unchanged. It is a label the author
  -- typed onto a diary they chose to publish, and /places already
  -- shows it to friends. Note that it is free text: an author who
  -- writes a street address into it defeats the blur below. That is a
  -- known, accepted limit — the blur exists to stop coordinates from
  -- pinpointing someone, not to censor what they wrote.
  dp.place_name,

  -- 0.2 degrees ~= 22km, the same grid lib/geo.ts blurCoord() uses:
  --   JS   Math.round(c * 5) / 5
  --   SQL  round((c * 5)::numeric) / 5
  -- The two disagree only when c * 5 lands exactly on x.5 AND c is
  -- negative — JS rounds toward +infinity, Postgres away from zero —
  -- which moves the result by one 0.2-degree cell, i.e. less than the
  -- blur itself. Not worth reconciling.
  (round((dp.lat * 5)::numeric) / 5)::double precision as lat,
  (round((dp.lng * 5)::numeric) / 5)::double precision as lng,

  -- Denormalised on purpose. A view carries no foreign keys, so
  -- PostgREST cannot embed diary_entries(...) through it the way
  -- places/page.tsx did against the base table. Selecting these here
  -- keeps that screen to a single request.
  de.diary_date,
  de.title as diary_title,

  dp.created_at
from public.diary_places dp
join public.diary_entries de
  on de.id = dp.diary_entry_id
-- The access rule. Everything this view exposes is, by definition,
-- attached to a diary its author published.
where de.is_public = true;

comment on view public.diary_places_public is
  'Public diary locations, rounded to a 0.2-degree grid (~22km). '
  'Intentionally not security_invoker: it must outlive the removal of '
  'the read_public_diary_places policy on diary_places. Access control '
  'is the is_public = true predicate in the view body. Blocks are not '
  'applied here — callers filter those, as they do everywhere else.';

grant select on public.diary_places_public to anon, authenticated;

-- refresh API cache
notify pgrst, 'reload schema';
