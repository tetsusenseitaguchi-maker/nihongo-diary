-- ============================================================
--  Nihongo Diary — 単語の間隔反復（SRS）
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑬ の順に1文ずつ実行する。
--
--  ⚠️ このファイルの末尾に ROLLBACK の記載があるが、実行しないこと。
--     すべてコメントとして書いてある。元に戻したいときだけ使う。
--
--  ── 何をする機能か ──────────────────────────────────────────
--  単語帳に保存した語を、忘れる前に出し直す。日本語 → 意味（英語）の
--  一方向。固定5段階（1日 → 3日 → 7日 → 14日 → 30日 → 卒業）で、
--  間違えたら1段階戻る。1日に出す枚数は Free 5 / Plus 30 / Pro 無制限。
--
--  ── 触らないもの ────────────────────────────────────────
--    - vocabulary_entries のスキーマ。列を1つも足さない。
--    - use_count / graduated_at。あれは「産出（日記で使えた）」の記録で、
--      ここが持つのは「再認（意味が言える）」。別の概念なので別の列に置く。
--      さらに api/learned/scan は候補を graduated_at is null で絞るので、
--      SRS があの列を書くと、その語は産出判定から永久に外れてしまう。
--    - normalizePlan / try_use_correction / try_use_translation /
--      try_use_audio_daily / try_use_recheck / try_use_word_lookup /
--      correction_count / translation_count / usage_limits / 既存トリガー。
--      読みも書きもしない。
--    - profiles には列を足さない。
--
--  ── 上限値の置き場所 ────────────────────────────────────
--  アプリ側（src/lib/srs-limits.ts）から p_limit で渡す。数字を変えても
--  マイグレーションは要らない。既存の try_use_* 4本と同じ形。
--
--  ── バックフィルは無い ──────────────────────────────────
--  「vocabulary_srs に行が無い = まだ一度も復習していない新規語」と
--  定義してある。既存の単語も、明日保存される単語も、同じ経路で拾える。
-- ============================================================


-- ============================================================
--  ① SRS 状態テーブル
-- ============================================================
-- PK は vocabulary_entry_id 単独。1 語につき最大1行で、単語帳から語が
-- 消えれば cascade で一緒に消える。user_id は RLS と日次クエリのために
-- 非正規化して持つ（vocabulary_entries を毎回 join せずに絞れる）。
--
-- stage の意味:
--   0 … 新規（行があってこの値なら、作られただけでまだ採点されていない）
--   1 … 1日後   2 … 3日後   3 … 7日後   4 … 14日後   5 … 30日後
--   6 … 卒業（due_on は null、srs_graduated_at に時刻）
-- 日数の実体は src/lib/srs.ts の SRS_STAGE_DAYS にあり、ここには持たない。
--
-- ⚠️ due_on を NULL 許容にしてあるのは fail-safe のため。卒業行は
--    due_on = null になるので、うっかり srs_graduated_at の条件を落とした
--    クエリでも `due_on <= today` が false になり、出題に混ざらない。
--    NOT NULL にして遠い未来の日付を入れる形だと、同じ取りこぼしが
--    「200年後に1回出る」ではなく「今日出る」側に倒れる。
create table if not exists public.vocabulary_srs (
  vocabulary_entry_id uuid primary key
                      references public.vocabulary_entries(id) on delete cascade,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  stage               smallint    not null default 0,
  due_on              date,
  last_reviewed_on    date,
  correct_count       integer     not null default 0,
  miss_count          integer     not null default 0,
  srs_graduated_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);


-- ============================================================
--  ② RLS 有効化
-- ============================================================
alter table public.vocabulary_srs enable row level security;


-- ============================================================
--  ③ ポリシー削除（③④はセットで実行する）
-- ============================================================
-- 先に消してから作る。permissive なポリシーは OR で足し合わされるので、
-- 名前違いのものを二重に作ると権限が広がりうる。
drop policy if exists "vocab_srs_owner" on public.vocabulary_srs;


-- ============================================================
--  ④ ポリシー作成
-- ============================================================
-- vocabulary_usages と同じ for all のオーナーポリシー。日次クォータでは
-- なく本人の学習状態なので、書き換えられて損をするのは本人だけ。
-- クォータ側（⑥〜⑨）は select しか許さない別テーブルにしてある。
create policy "vocab_srs_owner" on public.vocabulary_srs
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  ⑤ 「今日出す語」を引くための部分インデックス
-- ============================================================
-- 卒業行を最初から除外しておく。単語帳は数十件規模なので性能上の必要は
-- 薄いが、クエリの意図をインデックス側にも残しておく意味がある。
create index if not exists idx_vocab_srs_due
  on public.vocabulary_srs (user_id, due_on)
  where srs_graduated_at is null;


-- ============================================================
--  ⑥ 日次カウンタテーブル
-- ============================================================
-- ⚠️ usage_limits に列を足さない。あのテーブルには insert / update ポリシーが
--    あり、クライアントが自分のカウントを書き戻せる。audio_usage_daily /
--    shadowing_usage / word_lookup_usage を別テーブルにしたのと同じ理由。
create table if not exists public.vocab_review_usage (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  usage_date   date        not null,
  review_count integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, usage_date)
);


-- ============================================================
--  ⑦ RLS 有効化
-- ============================================================
alter table public.vocab_review_usage enable row level security;


-- ============================================================
--  ⑧ ポリシー削除（⑧⑨はセットで実行する）
-- ============================================================
drop policy if exists "Users read own vocab review usage" on public.vocab_review_usage;


-- ============================================================
--  ⑨ 残数を読むためだけの select ポリシー
-- ============================================================
-- select だけを許可する。insert / update / delete のポリシーは作らないので、
-- 書き込み経路は⑩の関数1本だけになる。
create policy "Users read own vocab review usage"
  on public.vocab_review_usage for select using (auth.uid() = user_id);


-- ============================================================
--  ⑩ カウンター関数
-- ============================================================
-- try_use_word_lookup / try_use_audio_daily と同じ形。
--
-- ⚠️ 引数にデフォルト値を付けない。付けると SQL Editor から呼んだときに
--    どのオーバーロードか決まらず落ちることがある。呼び出し側が3つとも渡す。
--
-- ⚠️ p_limit <= 0 の guard は日次テーブルでは必須。ON CONFLICT の WHERE は
--    「同じ (user_id, usage_date) の2回目以降」にしか効かないため、これが
--    無いと上限0のプランでも「毎日1回だけは通る」穴になる。
--
-- ⚠️ auth.uid() を見ているので、サービスロールから呼ぶと必ず false を返す。
--    ルート側はユーザーのセッションのクライアントで呼ぶこと。
--    SQL Editor から直接呼んだ場合も同じ理由で false になる（正常）。
create or replace function public.try_use_vocab_review(
  p_user_id uuid,
  p_date    date,
  p_limit   integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  if p_limit is null or p_limit <= 0 then
    return false;
  end if;

  insert into public.vocab_review_usage (user_id, usage_date, review_count, created_at, updated_at)
  values (p_user_id, p_date, 1, now(), now())
  on conflict (user_id, usage_date) do update
    set review_count = public.vocab_review_usage.review_count + 1,
        updated_at   = now()
  where public.vocab_review_usage.review_count < p_limit
  returning review_count into v_new_count;

  -- WHERE が UPDATE を止めたとき v_new_count は NULL（＝この要求の前に
  -- その日の上限へ到達していた）。
  return v_new_count is not null;
end;
$$;


-- ============================================================
--  ⑪ 関数の権限を絞る
-- ============================================================
revoke all on function public.try_use_vocab_review(uuid, date, integer) from public, anon;


-- ============================================================
--  ⑫ authenticated にだけ実行権限を渡す
-- ============================================================
-- ⚠️ ここは authenticated に付けるのが正しい。関数の中で auth.uid() の一致を
--    確認しているので、他人のぶんは確保できない。service_role に渡すと
--    auth.uid() が null になり、常に false を返す。
grant execute on function public.try_use_vocab_review(uuid, date, integer) to authenticated;


-- ============================================================
--  ⑬ PostgREST にスキーマを読み直させる
-- ============================================================
notify pgrst, 'reload schema';


-- ============================================================
--  実行後の確認（任意・読み取りのみ）
-- ============================================================
-- 1) テーブルが2つできているか
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND table_name IN ('vocabulary_srs','vocab_review_usage');
--   期待: 2行
--
-- 2) 関数が登録されているか
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('try_use_vocab_review','try_use_word_lookup',
--                      'try_use_audio_daily','try_use_correction',
--                      'try_use_recheck','try_use_translation',
--                      'try_use_shadowing');
--   期待: try_use_vocab_review を含む既存ぶん全部
--
-- 3) ポリシーが1本ずつか
--   SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE tablename IN ('vocabulary_srs','vocab_review_usage');
--   期待: vocabulary_srs = ALL 1本 / vocab_review_usage = SELECT 1本
--
-- ⚠️ SQL Editor から try_use_vocab_review() を直接呼ぶと必ず false が返る。
--    auth.uid() が null だからで、これは想定どおり。try_use_correction /
--    try_use_translation / try_use_word_lookup と同じ挙動。動作確認は
--    アプリのルートが載ってから。
--
-- ============================================================
--  ROLLBACK（実行しないこと。戻すときだけコメントを外す）
-- ============================================================
--   DROP FUNCTION IF EXISTS public.try_use_vocab_review(uuid, date, integer);
--   DROP TABLE IF EXISTS public.vocab_review_usage;
--   DROP TABLE IF EXISTS public.vocabulary_srs;
--   NOTIFY pgrst, 'reload schema';
--
--   vocabulary_entries には一切触れていないので、上の3文で完全に元へ戻る。
--   単語帳の中身・use_count・graduated_at・vocabulary_usages は無傷。
-- ============================================================
