-- ============================================================
--  Nihongo Diary — plan + daily usage limits
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── 1. Plan column on profiles ─────────────────────────────
-- Stores the user's current active plan.
-- Existing rows automatically receive the default value 'free'.
alter table public.profiles
  add column if not exists plan text not null default 'free';

-- ── 2. Stripe columns (Stripe integration, future) ─────────
-- stripe_customer_id: looked up by Stripe webhooks to identify the user.
-- stripe_subscription_id: the active Stripe subscription (nullable = no paid sub).
-- When Stripe goes live, the webhook handler runs:
--   UPDATE profiles SET plan = 'pro', stripe_subscription_id = 'sub_xxx'
--   WHERE stripe_customer_id = 'cus_xxx';
alter table public.profiles
  add column if not exists stripe_customer_id text;

alter table public.profiles
  add column if not exists stripe_subscription_id text;

-- Unique index so Stripe webhook lookups are fast and unambiguous.
create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ── 3. Daily usage counters ─────────────────────────────────
-- One row per (user, date). Incremented atomically by try_use_correction().
-- The unique constraint is required for the ON CONFLICT upsert to work.
create table if not exists public.usage_limits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  usage_date       date not null,
  correction_count integer not null default 0,
  native_count     integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
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

-- ── 4. Reload PostgREST schema cache ───────────────────────
notify pgrst, 'reload schema';


-- ============================================================
--  HOW TO MANUALLY CHANGE A USER'S PLAN (dev / testing)
--  Run in SQL Editor while logged in as a Supabase admin.
-- ============================================================
-- UPDATE public.profiles SET plan = 'pro'  WHERE username = 'your_username';
-- UPDATE public.profiles SET plan = 'plus' WHERE username = 'your_username';
-- UPDATE public.profiles SET plan = 'free' WHERE username = 'your_username';
--
-- Verify:
-- SELECT id, username, plan FROM public.profiles;
-- ============================================================
