-- ============================================================
--  Nihongo Diary — atomic correction-limit enforcement
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (CREATE OR REPLACE).
-- ============================================================

-- Atomically claim one correction slot for a user on a given date.
-- Returns TRUE  → slot granted, caller may proceed to call OpenAI.
-- Returns FALSE → daily limit already reached, caller should return 429.
--
-- Uses INSERT ... ON CONFLICT DO UPDATE WHERE to make the check and
-- increment a single atomic operation. Row-level locking inside the
-- ON CONFLICT handler prevents concurrent requests from both slipping
-- through when the count is at the boundary.

create or replace function public.try_use_correction(
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

  insert into public.usage_limits (user_id, usage_date, correction_count, updated_at)
  values (p_user_id, p_date, 1, now())
  on conflict (user_id, usage_date) do update
    set correction_count = public.usage_limits.correction_count + 1,
        updated_at       = now()
  where public.usage_limits.correction_count < p_limit
  returning correction_count into v_new_count;

  -- v_new_count is NULL when the WHERE clause prevented the update
  -- (i.e. the limit was already reached before this request).
  return v_new_count is not null;
end;
$$;

-- Allow authenticated users to call the function.
grant execute on function public.try_use_correction(uuid, date, integer)
  to authenticated;

notify pgrst, 'reload schema';
