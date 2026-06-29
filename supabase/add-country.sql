-- ============================================================
--  Nihongo Diary — per-user country on profiles
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (IF NOT EXISTS / named constraint).
--
--  Design:
--    - Adds a nullable `country` column to public.profiles.
--    - Stores ISO 3166-1 alpha-2 codes ("JP", "US", "ES", …).
--    - NULL = user has not set a country (skip flag display).
--    - CHECK ensures exactly 2 uppercase letters when non-null.
--
--  RLS:
--    - No new policies needed.
--    - "Public profiles are viewable by everyone" covers SELECT.
--    - "Users can update their own profile" covers UPDATE.
--
--  Impact on existing data / plan logic:
--    - Existing rows receive NULL automatically (no default value).
--    - plan, stripe_*, timezone columns are NOT touched.
--    - Completely independent of try_use_correction() and all
--      billing / plan-check logic.
-- ============================================================

-- Add the column (idempotent — no-op if it already exists).
alter table public.profiles
  add column if not exists country text;

-- Add CHECK constraint if it does not already exist.
-- Uses DO block so the constraint name lookup is idempotent.
do $$
begin
  if not exists (
    select 1
    from   pg_constraint
    where  conname = 'profiles_country_code'
      and  conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_country_code check (
        country is null
        or (char_length(country) = 2 and country = upper(country))
      );
  end if;
end
$$;

notify pgrst, 'reload schema';
