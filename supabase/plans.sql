-- ============================================================
--  Nihongo Diary — plan + daily usage limits (no payments yet)
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
-- ============================================================

-- 1) Plan stored on the profile (free | plus | pro | teacher_feedback)
alter table public.profiles
  add column if not exists plan text not null default 'free';

-- 2) Daily usage counters
create table if not exists public.usage_limits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  usage_date       date not null,
  correction_count integer default 0,
  native_count     integer default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, usage_date)
);
create index if not exists usage_limits_user_date_idx
  on public.usage_limits (user_id, usage_date);

alter table public.usage_limits enable row level security;

drop policy if exists "Users read own usage" on public.usage_limits;
create policy "Users read own usage"
  on public.usage_limits for select using (auth.uid() = user_id);

drop policy if exists "Users insert own usage" on public.usage_limits;
create policy "Users insert own usage"
  on public.usage_limits for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own usage" on public.usage_limits;
create policy "Users update own usage"
  on public.usage_limits for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- refresh API cache
notify pgrst, 'reload schema';
