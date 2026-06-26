-- Migration: add Stripe billing columns to profiles
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- stripe_customer_id: Stripe's permanent customer ID (cus_xxx)
-- Needed to: look up subscriptions by customer, pre-fill billing portal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Unique index so webhook lookups by customer ID are fast
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Ensure plan column exists with a safe default
ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free';

UPDATE public.profiles
  SET plan = 'free'
  WHERE plan IS NULL;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
