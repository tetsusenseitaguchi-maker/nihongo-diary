-- ============================================================
--  Nihongo Diary — refund a correction slot on downstream failure
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (CREATE OR REPLACE).
--
--  Does NOT modify try_use_correction() in add-correction-limit-fn.sql.
--  Called from the app when a claimed correction slot could not be
--  fulfilled (AI API error, JSON parse failure, max_tokens truncation)
--  to give the user back their daily correction credit.
-- ============================================================

create or replace function public.refund_correction(
  p_user_id uuid,
  p_date    date
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Security: only the authenticated user may refund their own slot.
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  update public.usage_limits
  set correction_count = greatest(correction_count - 1, 0),
      updated_at        = now()
  where user_id = p_user_id
    and usage_date = p_date;
end;
$$;

-- Allow authenticated users to call the function.
grant execute on function public.refund_correction(uuid, date)
  to authenticated;

notify pgrst, 'reload schema';
