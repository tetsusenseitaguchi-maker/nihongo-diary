-- ============================================================
--  Nihongo Diary — daily recheck-limit enforcement
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--
--  Design:
--    - Adds recheck_count to the existing usage_limits table.
--    - profiles is NOT touched.
--    - correction_count is NOT touched.
--    - translation_count is NOT touched.
--    - try_use_correction() / try_use_translation() / refund_correction()
--      are NOT touched — this file only ADDS a new column and a new function.
--    - try_use_recheck() mirrors try_use_translation() exactly, operating
--      only on recheck_count.
--
--  The daily limit itself is NOT stored here — the caller passes p_limit,
--  same as the correction and translation functions. Changing the Free
--  allowance later is an app-side change with no migration.
-- ============================================================

-- ── 1. New counter column ───────────────────────────────────
-- Additive only. "if not exists" makes re-runs a no-op, and a NOT NULL
-- column with a constant DEFAULT is a metadata-only change in PostgreSQL 11+
-- (no table rewrite, no long lock). Existing rows read back as 0.
alter table public.usage_limits
  add column if not exists recheck_count integer not null default 0;

-- ── 2. Atomic claim function ────────────────────────────────
-- Atomically claim one recheck slot for a user on a given date.
-- Returns TRUE  → slot granted, caller may proceed to call the AI.
-- Returns FALSE → daily limit already reached, caller returns 429.
--
-- Uses INSERT ... ON CONFLICT DO UPDATE WHERE (same pattern as
-- try_use_correction / try_use_translation) to make check + increment a
-- single atomic op, so concurrent requests cannot both slip through at the
-- boundary.
create or replace function public.try_use_recheck(
  p_user_id  uuid,
  p_date     date,
  p_limit    integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  -- Security: only the authenticated user may claim their own slot.
  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  insert into public.usage_limits (user_id, usage_date, recheck_count, updated_at)
  values (p_user_id, p_date, 1, now())
  on conflict (user_id, usage_date) do update
    set recheck_count = public.usage_limits.recheck_count + 1,
        updated_at    = now()
  where public.usage_limits.recheck_count < p_limit
  returning recheck_count into v_new_count;

  -- v_new_count is NULL when the WHERE clause prevented the update
  -- (i.e. the limit was already reached before this request).
  return v_new_count is not null;
end;
$$;

-- ── 3. Grant ────────────────────────────────────────────────
grant execute on function public.try_use_recheck(uuid, date, integer)
  to authenticated;

-- ── 4. Reload PostgREST schema cache ────────────────────────
-- Required before supabase.rpc("try_use_recheck", ...) can resolve.
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY (run after the statements above)
-- ============================================================
-- Column exists and defaults to 0:
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'usage_limits'
--   ORDER BY ordinal_position;
--
-- Function exists, is SECURITY DEFINER, and is executable by authenticated:
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname LIKE 'try_use_%';
--
-- NOTE: calling try_use_recheck() directly from the SQL Editor always
-- returns FALSE — auth.uid() is NULL there, so the ownership guard trips.
-- This is expected and matches try_use_correction / try_use_translation.
-- Functional testing happens from the app, once the route ships.

-- ============================================================
--  ROLLBACK (only if needed)
-- ============================================================
-- Drop the function only — the route treats a missing/erroring RPC as
-- "allow", so rechecks return to being unlimited without breaking:
--   DROP FUNCTION IF EXISTS public.try_use_recheck(uuid, date, integer);
--
-- Full rollback (also discards the counts collected so far):
--   ALTER TABLE public.usage_limits DROP COLUMN IF EXISTS recheck_count;
--   NOTIFY pgrst, 'reload schema';
