-- ============================================================
--  Nihongo Diary — daily translation-limit enforcement
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--
--  Design:
--    - Adds translation_count to the existing usage_limits table.
--    - profiles is NOT touched.
--    - correction_count is NOT touched.
--    - try_use_translation() mirrors try_use_correction() exactly,
--      operating only on translation_count.
-- ============================================================

-- Add translation_count to usage_limits (idempotent — no-op if exists).
alter table public.usage_limits
  add column if not exists translation_count integer not null default 0;

-- Atomically claim one translation slot for a user on a given date.
-- Returns TRUE  → slot granted, caller may proceed.
-- Returns FALSE → daily limit already reached, caller returns 429.
--
-- Uses INSERT ... ON CONFLICT DO UPDATE WHERE (same pattern as
-- try_use_correction) to make check + increment a single atomic op.
create or replace function public.try_use_translation(
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

  insert into public.usage_limits (user_id, usage_date, translation_count, updated_at)
  values (p_user_id, p_date, 1, now())
  on conflict (user_id, usage_date) do update
    set translation_count = public.usage_limits.translation_count + 1,
        updated_at        = now()
  where public.usage_limits.translation_count < p_limit
  returning translation_count into v_new_count;

  -- v_new_count is NULL when the WHERE clause prevented the update
  -- (i.e. the limit was already reached before this request).
  return v_new_count is not null;
end;
$$;

grant execute on function public.try_use_translation(uuid, date, integer)
  to authenticated;

notify pgrst, 'reload schema';
