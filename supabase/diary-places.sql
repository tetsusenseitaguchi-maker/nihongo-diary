-- diary_places: stores location pins attached to diary entries
create table if not exists public.diary_places (
  id              uuid default gen_random_uuid() primary key,
  diary_entry_id  uuid not null references public.diary_entries(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  place_name      text,
  lat             double precision not null,
  lng             double precision not null,
  created_at      timestamptz default now() not null
);

create index if not exists idx_diary_places_entry on public.diary_places(diary_entry_id);
create index if not exists idx_diary_places_user  on public.diary_places(user_id);

alter table public.diary_places enable row level security;

-- Owner can CRUD their own places
create policy "owner_all" on public.diary_places
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read places of public diaries
create policy "read_public_diary_places" on public.diary_places
  for select using (
    exists (
      select 1 from public.diary_entries de
      where de.id = diary_entry_id
        and de.is_public = true
    )
  );

notify pgrst, 'reload schema';
