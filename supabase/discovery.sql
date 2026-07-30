-- ============================================================
--  Nihongo Diary — Discovery: per-user opt-out + feed source
--  Run this in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times.
--
--  ADDITIVE ONLY.
--    - 新規テーブル1つ、新規ビュー1つ、新規インデックス1つ。
--    - 既存のテーブル・カラム・ポリシー・トリガー・関数は
--      いっさい変更しません。
--    - profiles には触れません。カラム追加も、既存 SELECT の
--      変更もありません。plan を読むクエリは1本も影響を受けない
--      ため、「本番にカラムが無くて全員 Free 化」の再発経路が
--      構造的に存在しません。
--
--  Not touched: normalizePlan / try_use_correction /
--  correction_count / translation_count / billing_source /
--  既存の DB トリガー / follows / blocks / comments /
--  peer_corrections / diary_places。
-- ============================================================

-- ------------------------------------------------------------
-- 1) discovery_settings — 「Discovery に出さない」トグル
--
--    行が無い = opted_out false（＝表示する）。既存ユーザー
--    全員にバックフィルする必要がなく、テーブルは実際に
--    トグルを触った人の分だけ育ちます。
--
--    profiles を参照するのは comments / peer_corrections /
--    diary_places と同じ流儀です（PostgREST が将来 join できる）。
--    profiles の行はサインアップ時に handle_new_user が作るので、
--    参照先が無くて insert が失敗することはありません。
-- ------------------------------------------------------------
create table if not exists public.discovery_settings (
  user_id    uuid        primary key references public.profiles (id) on delete cascade,
  opted_out  boolean     not null default false,
  updated_at timestamptz not null default now()
);

alter table public.discovery_settings enable row level security;

-- 本人のみ読み書き。他人の設定は誰にも見えません。
-- Discovery 側の除外はこのテーブルを直接読まず、下の
-- discovery_entries ビューが解決します。
drop policy if exists "Read own discovery settings" on public.discovery_settings;
create policy "Read own discovery settings"
  on public.discovery_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Insert own discovery settings" on public.discovery_settings;
create policy "Insert own discovery settings"
  on public.discovery_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Update own discovery settings" on public.discovery_settings;
create policy "Update own discovery settings"
  on public.discovery_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE ポリシーは意図的に作りません。トグルを戻すときは
-- opted_out = false を書きます。行の削除で表現する必要がなく、
-- 開ける権限は少ないほうがよいためです。

-- updated_at トリガー（schema.sql の関数を再利用。peer_corrections と同じ）
-- 新規テーブルに新規トリガーを足すだけで、既存トリガーは触りません。
drop trigger if exists discovery_settings_set_updated_at on public.discovery_settings;
create trigger discovery_settings_set_updated_at
  before update on public.discovery_settings
  for each row execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 2) discovery_entries — Discovery が読む唯一のソース
--
--    security_invoker は意図的に付けていません。付けると呼び出し
--    ユーザーとして評価され、discovery_settings の「本人のみ」
--    ポリシーに阻まれて他人の opted_out が読めず、除外が効きま
--    せん。所有者権限で動かすことで、設定そのものは非公開のまま
--    「除外の結果」だけを外に出せます。
--
--    Supabase のリンタが "security_definer_view" を警告します。
--    diary_places_public と同じく意図的です。アクセス規則は
--    ビュー本体の WHERE にあり、呼び出し側は書き換えられません。
--    レビューする人へ: この WHERE を緩めることは、クエリの編集
--    ではなく権限境界の拡張です。
--
--    anon には grant しません。Discovery はログイン必須です。
-- ------------------------------------------------------------
create or replace view public.discovery_entries
with (security_barrier = true) as
select
  de.id,
  de.user_id,
  de.diary_date,
  de.title,
  de.tags,
  de.original_text,
  de.corrected_japanese,
  de.seeking_peer_correction,
  de.created_at
from public.diary_entries de
-- left join + coalesce が「行が無い = 表示する」の実装です。
left join public.discovery_settings ds
  on ds.user_id = de.user_id
where de.is_public = true
  and coalesce(ds.opted_out, false) = false;

comment on view public.discovery_entries is
  'Public diaries eligible for the Discovery tab: is_public and the author '
  'has not opted out. Intentionally not security_invoker — discovery_settings '
  'is owner-only, so the exclusion has to be resolved here. Blocks are NOT '
  'applied; callers filter those, as they do everywhere else.';

grant select on public.discovery_entries to authenticated;


-- ------------------------------------------------------------
-- 3) 部分インデックス
--
--    diary_entries の既存インデックスは (user_id, diary_date desc)
--    と tags の GIN だけで、「公開日記を新しい順に200件」に効く
--    ものがありません。部分インデックスなので非公開の行は入らず、
--    サイズは公開日記の件数ぶんで済みます。
--    既存クエリのプランには影響しません（条件が違うため）。
--
--    大きなテーブルで書き込みを止めたくない場合は、この文だけを
--    create index concurrently として単独で実行してください
--    （トランザクション内では実行できません）。
-- ------------------------------------------------------------
create index if not exists idx_diary_entries_public_created
  on public.diary_entries (created_at desc)
  where is_public = true;

-- refresh API cache
notify pgrst, 'reload schema';


-- ============================================================
--  ROLLBACK
--
--    drop view  if exists public.discovery_entries;
--    drop table if exists public.discovery_settings;
--    drop index if exists public.idx_diary_entries_public_created;
--    notify pgrst, 'reload schema';
--
--  ただし drop table は opt-out 設定を消します。機能を公開した
--  あとに戻す場合は、テーブルを残したままアプリ側で Discovery
--  タブを隠すほうが安全です — 「出さない」と表明した人の意思を
--  消さずに済みます。
-- ============================================================
