-- ============================================================
--  Nihongo Diary — Learned Items（「使えた」判定）
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--
--  ⚠️ 本番 DB には既にこの構造が入っている（Step 1 で手動実行済み。
--     ファイルがリポジトリに残っていなかったので、記録として起こしたもの）。
--     実測で確認した現状:
--       vocabulary_usages         … 存在する
--         (id, user_id, vocabulary_entry_id, diary_entry_id,
--          matched_text, created_at)
--       vocabulary_entries.use_count    … 存在する
--       vocabulary_entries.graduated_at … 存在する
--
--  そのため、このファイルは「新規環境を再現するため」のもの。
--  既存 DB に流しても安全なように、全ての文を
--    ・追加のみ（DROP / ALTER TYPE / データ書き換えを一切しない）
--    ・既にあるものには触らない
--  で書いてある。特に一意インデックスと RLS ポリシーは、
--  既存のものと名前が違っても二重に作らないよう存在チェックで包んでいる
--  （名前違いのポリシーを足すと権限が広がりうるため）。
--
--  touches: vocabulary_entries（単語帳）と vocabulary_usages だけ。
--  profiles / plan / correction_count / translation_count / Stripe には
--  一切触れない。既存のトリガーも追加・変更しない。
-- ============================================================

-- ---------- 1. 単語帳に「使えた回数」と「卒業日時」 ----------
-- use_count は vocabulary_usages の行数から毎回再計算される派生値。
-- /api/learned/scan は加算しないので、二重カウントも取りこぼしも起きない。
-- graduated_at が非 NULL の行は「卒業済み」= 以後の照合対象から外れる。
alter table public.vocabulary_entries
  add column if not exists use_count    integer not null default 0,
  add column if not exists graduated_at timestamptz;

-- ---------- 2. 「どの語をどの日記で使えたか」の実績テーブル ----------
create table if not exists public.vocabulary_usages (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  vocabulary_entry_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  diary_entry_id      uuid not null references public.diary_entries(id) on delete cascade,
  -- 日記中で実際にマッチした表層形（例: 食べる → "食べました"）。
  -- 学習者に「この形で使えていました」と見せるための記録。判定には使わない。
  matched_text        text,
  created_at          timestamptz default now()
);

-- ---------- 3. 冪等性の土台 ----------
-- 同じ日記で同じ語は1行だけ。/api/learned/scan の upsert が
-- ON CONFLICT (vocabulary_entry_id, diary_entry_id) で参照する。
-- Postgres は列の組み合わせから arbiter index を推論するので、
-- インデックス名は何でもよい — 「一意であること」だけが要る。
-- そのため既存の一意インデックス（名前不明）があれば何も作らない。
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'vocabulary_usages'
      and i.indisunique
      and i.indnatts = 2
      and i.indkey::int2[] @> array[
            (select attnum from pg_attribute
              where attrelid = t.oid and attname = 'vocabulary_entry_id'),
            (select attnum from pg_attribute
              where attrelid = t.oid and attname = 'diary_entry_id')
          ]::int2[]
  ) then
    create unique index idx_vocab_usage_entry_diary
      on public.vocabulary_usages(vocabulary_entry_id, diary_entry_id);
  end if;
end $$;

-- use_count の再計算（entry ごとの count(*)）用。
create index if not exists idx_vocab_usage_entry
  on public.vocabulary_usages(vocabulary_entry_id);

-- 一覧表示（新しい順）用。
create index if not exists idx_vocab_usage_user_created
  on public.vocabulary_usages(user_id, created_at desc);

-- ---------- 4. RLS — 自分の実績しか読み書きできない ----------
alter table public.vocabulary_usages enable row level security;

-- 既にポリシーが1本でもある場合は触らない。
-- permissive なポリシーは OR で足し合わされるため、名前違いのものを
-- 追加すると既存の制限を緩めてしまう可能性がある。
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'vocabulary_usages'
  ) then
    create policy "vocab_usage_owner" on public.vocabulary_usages
      for all
      using      (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
