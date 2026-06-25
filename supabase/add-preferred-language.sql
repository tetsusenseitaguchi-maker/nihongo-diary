-- User's preferred display/translation language (BCP-47 code, e.g. "en", "es").
alter table public.profiles
  add column if not exists preferred_language text not null default 'en';
