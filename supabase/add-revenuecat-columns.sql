-- ============================================================
--  Nihongo Diary — RevenueCat (Apple IAP) billing columns
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  Adds the columns needed to track which billing rail (Stripe web
--  checkout vs Apple In-App Purchase via RevenueCat) a user's active
--  subscription is on, so the UI can avoid offering a second purchase
--  path for a plan they already have on the other rail — the
--  RevenueCat counterpart to the Stripe duplicate-subscription guard
--  added earlier (see checkout/route.ts's stripe_subscription_id check).
-- ============================================================

-- billing_source: which payment rail is currently active for this user.
-- 'stripe' | 'apple_iap' | null (never subscribed via either yet).
-- Not constrained with a CHECK — validated at the app layer, same as
-- the existing `plan` column (see normalizePlan()).
alter table public.profiles
  add column if not exists billing_source text;

-- revenuecat_app_user_id: the RevenueCat "app_user_id" this profile is
-- identified as. RevenueCatInit.tsx configures Purchases with
-- appUserID = the Supabase user's own id, so this will always equal
-- profiles.id in this app — stored explicitly (rather than assumed)
-- so the RevenueCat webhook handler can match incoming events the same
-- way stripe/webhook/route.ts matches on stripe_customer_id.
alter table public.profiles
  add column if not exists revenuecat_app_user_id text;

create unique index if not exists profiles_revenuecat_app_user_id_idx
  on public.profiles (revenuecat_app_user_id)
  where revenuecat_app_user_id is not null;

-- Backfill: revenuecat_app_user_id is deterministic (always = profiles.id
-- per RevenueCatInit.tsx), so it's safe to set for every existing row now
-- rather than waiting for each user's first RevenueCat webhook event.
update public.profiles
  set revenuecat_app_user_id = id
  where revenuecat_app_user_id is null;

-- Backfill: existing paying Stripe customers are tagged 'stripe'
-- immediately, so a later UI-hiding step is correct for them from day
-- one instead of waiting for their next Stripe webhook event.
update public.profiles
  set billing_source = 'stripe'
  where stripe_subscription_id is not null
    and billing_source is null;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
