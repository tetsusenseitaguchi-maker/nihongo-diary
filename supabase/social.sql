-- ============================================================
--  Nihongo Diary — Learning Together (follows / activity / reactions)
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  Privacy: the feed shows ACTIVITY RECORDS, never private diary
--  text. Diary content is only readable when diary_entries.is_public
--  is true (handled by diary_entries RLS). Activity rows carry no
--  diary text, so they are readable by authenticated users; the
--  /feed query itself only shows people you follow (plus yourself).
-- ============================================================

-- Make sure diaries can be shared (default private)
alter table public.diary_entries
  add column if not exists is_public boolean not null default false;

-- Allow anyone to read a diary ONLY when it is public (content privacy)
drop policy if exists "Anyone can read public diaries" on public.diary_entries;
create policy "Anyone can read public diaries"
  on public.diary_entries for select
  using (is_public = true);

-- ------------------------------------------------------------
-- 1) follows
-- ------------------------------------------------------------
create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists "Follows are readable" on public.follows;
create policy "Follows are readable"
  on public.follows for select using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id and follower_id <> following_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ------------------------------------------------------------
-- 2) activity_feed
-- ------------------------------------------------------------
create table if not exists public.activity_feed (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  activity_type  text not null,           -- joined | wrote_diary | reached_streak | completed_weekly_goal | shared_diary
  diary_entry_id uuid references public.diary_entries (id) on delete set null,
  metadata       jsonb default '{}'::jsonb,
  created_at     timestamptz default now()
);
create index if not exists activity_feed_user_idx on public.activity_feed (user_id, created_at desc);

alter table public.activity_feed enable row level security;

-- Activity rows contain no private diary text, so authenticated users
-- may read them. The /feed query restricts to people you follow + you.
drop policy if exists "Activity is readable" on public.activity_feed;
create policy "Activity is readable"
  on public.activity_feed for select using (true);

drop policy if exists "Users insert own activity" on public.activity_feed;
create policy "Users insert own activity"
  on public.activity_feed for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own activity" on public.activity_feed;
create policy "Users delete own activity"
  on public.activity_feed for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) reactions
-- ------------------------------------------------------------
create table if not exists public.reactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  activity_id   uuid not null references public.activity_feed (id) on delete cascade,
  reaction_type text not null,            -- nice | keep_going | great_streak | congrats
  created_at    timestamptz default now(),
  unique (user_id, activity_id, reaction_type)
);
create index if not exists reactions_activity_idx on public.reactions (activity_id);

alter table public.reactions enable row level security;

drop policy if exists "Reactions are readable" on public.reactions;
create policy "Reactions are readable"
  on public.reactions for select using (true);

drop policy if exists "Users add own reactions" on public.reactions;
create policy "Users add own reactions"
  on public.reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own reactions" on public.reactions;
create policy "Users delete own reactions"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) On signup, create profile (existing) + a "joined" activity
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name'
  )
  on conflict (id) do nothing;

  insert into public.activity_feed (user_id, activity_type)
  values (new.id, 'joined');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- refresh API cache
notify pgrst, 'reload schema';
