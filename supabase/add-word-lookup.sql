-- ============================================================
--  Nihongo Diary — 英→日の語彙引き：回数管理と共有キャッシュ
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑦ の順に1文ずつ実行する。
--
--  ⚠️ このファイルの末尾に ROLLBACK の記載があるが、実行しないこと。
--     すべてコメントとして書いてある。元に戻したいときだけ、コメントを
--     外して使う。
--
--  ── 何をする機能か ──────────────────────────────────────────
--  書く画面で英単語を入れると、日本語（漢字＋読み）・意味・JLPT レベルが
--  返り、タップで本文のカーソル位置に入る。辞書を引きにアプリを出る必要を
--  無くすためのもの。
--
--  ── 設計 ────────────────────────────────────────────────
--    - 既存の翻訳の回数管理には一切触らない。try_use_translation /
--      translation_count / usage_limits は読みも書きもしない。他人の日記を
--      読んで翻訳を使い切った学習者が、自分の日記を書けなくなるのは筋が
--      通らないので、枠を分ける。
--    - correction_count / try_use_correction / normalizePlan / 既存トリガー
--      にも触らない。
--    - profiles には列を足さない。
--    - 上限値はアプリ側（lib/word-lookup-limits.ts）から p_limit で渡す。
--      数字を変えてもマイグレーションは要らない。
--
--  ── 上限を 20/日 にした根拠（本番実測）────────────────────
--    Free の日記は maxChars=300 が上限で、実際の中央値は 67 文字 ≒ 39 語。
--    20 回は「典型的な日記の語数の半分」を引ける計算になる。
--    より確かな根拠は隣接機能で、タップ翻訳（上限 10/日）は
--      1回以上使った日 212 日 / 中央値 1 回 / p90 5 回 / 上限到達 4%
--    だった。20 は使用を止める数字ではなく、乱用の天井として置いている。
--    さらに⑤のキャッシュに当たった引きは数えないので、20 は「まだ誰も
--    引いていない語を 20 個」の意味になる。
-- ============================================================


-- ============================================================
--  ① 使用回数テーブル
-- ============================================================
-- ⚠️ usage_limits に列を足さない。あのテーブルには insert / update ポリシーが
--    あり、クライアントが自分のカウントを書き戻せる。audio_usage_daily と
--    shadowing_usage を別テーブルにしたのと同じ理由。
create table if not exists public.word_lookup_usage (
  user_id           uuid not null references auth.users (id) on delete cascade,
  usage_date        date not null,
  word_lookup_count integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, usage_date)
);


-- ============================================================
--  ② RLS ＋ 自分の残数だけ読める select ポリシー
-- ============================================================
-- select だけを許可する。insert / update / delete のポリシーは作らないので、
-- 書き込み経路は③の関数1本だけになる。
alter table public.word_lookup_usage enable row level security;

drop policy if exists "Users read own word lookup usage" on public.word_lookup_usage;
create policy "Users read own word lookup usage"
  on public.word_lookup_usage for select using (auth.uid() = user_id);


-- ============================================================
--  ③ カウンター関数
-- ============================================================
-- try_use_shadowing / try_use_audio_daily と同じ形。
--
-- ⚠️ p_limit <= 0 の guard は日次テーブルでは必須。ON CONFLICT の WHERE は
--    「同じ (user_id, usage_date) の2回目以降」にしか効かないため、これが
--    無いと上限0のプランでも「毎日1回だけは通る」穴になる。
--
-- ⚠️ auth.uid() を見ているので、サービスロールから呼ぶと必ず false を返す。
--    ルート側はユーザーのセッションのクライアントで呼ぶこと。
--    SQL Editor から直接呼んだ場合も同じ理由で false になる（正常）。
create or replace function public.try_use_word_lookup(
  p_user_id  uuid,
  p_date     date,
  p_limit    integer
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

  insert into public.word_lookup_usage (user_id, usage_date, word_lookup_count, created_at, updated_at)
  values (p_user_id, p_date, 1, now(), now())
  on conflict (user_id, usage_date) do update
    set word_lookup_count = public.word_lookup_usage.word_lookup_count + 1,
        updated_at        = now()
  where public.word_lookup_usage.word_lookup_count < p_limit
  returning word_lookup_count into v_new_count;

  -- WHERE が UPDATE を止めたとき v_new_count は NULL（＝この要求の前に
  -- その日の上限へ到達していた）。
  return v_new_count is not null;
end;
$$;


-- ============================================================
--  ④ 関数の権限
-- ============================================================
-- ⚠️ ここは authenticated に付けるのが正しい。関数の中で auth.uid() の一致を
--    確認しているので、他人のぶんは確保できない。service_role に渡すと
--    auth.uid() が null になり、常に false を返す。
revoke all on function public.try_use_word_lookup(uuid, date, integer) from public, anon;
grant execute on function public.try_use_word_lookup(uuid, date, integer) to authenticated;


-- ============================================================
--  ⑤ 共有キャッシュ
-- ============================================================
-- 英単語の引きは必ず重複する（tired, cat, beautiful…）。ルートはこの表を
-- カウンターの「上」で引くので、他の誰かが既に引いた語は無料かつ即答になる。
-- /api/tts が依存しているのと同じ順序で、20回という上限が「まだ誰も引いて
-- いない語を20個」に変わるのはこのため。
--
-- lang が主キーに入っているのは、意味を学習者の UI 言語で返すから。
-- "tired" の意味は en / ja / fr で別の文字列になる。
--
-- ⚠️ 入れてよいのは辞書に載る形のものだけ。英字・空白・ハイフン・
--    アポストロフィのみ、24文字以内、3語まで（lib/word-lookup-limits.ts の
--    isCacheableQuery）。この表は内容アドレスで user_id を持たず、退会時にも
--    消えない。tts-shared に本人の文を入れないのと同じ線引きで、文章を
--    投げられた場合は答えるがキャッシュしない。
create table if not exists public.word_lookup_cache (
  query      text not null,
  lang       text not null,
  japanese   text not null,
  reading    text,
  meaning    text not null,
  level      text,
  created_at timestamptz not null default now(),
  primary key (query, lang)
);


-- ============================================================
--  ⑥ キャッシュの RLS（ポリシーは1本も作らない）
-- ============================================================
-- 読み書きするのはサービスロールだけで、サービスロールは RLS を通らない。
-- クライアントから見ると存在しないテーブルとして振る舞う。
alter table public.word_lookup_cache enable row level security;


-- ============================================================
--  ⑦ キャッシュの権限
-- ============================================================
-- 追記のみ。update / delete は与えない。
revoke all on table public.word_lookup_cache from public, anon, authenticated;
grant select, insert on table public.word_lookup_cache to service_role;


-- ============================================================
--  VERIFY — 適用直後
-- ============================================================
--   SELECT to_regclass('public.word_lookup_usage')  AS usage_table,
--          to_regclass('public.word_lookup_cache')  AS cache_table,
--          to_regproc('public.try_use_word_lookup') AS fn;
--   -- 期待: 3つとも名前が返る（NULL は未適用）
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE  oid IN ('public.word_lookup_usage'::regclass, 'public.word_lookup_cache'::regclass);
--   -- 期待: どちらも true
--
--   SELECT tablename, count(*) FROM pg_policies
--   WHERE  tablename IN ('word_lookup_usage','word_lookup_cache') GROUP BY 1;
--   -- 期待: word_lookup_usage = 1 のみ（cache は0本なので行が出ない）
--
--   SELECT grantee, privilege_type FROM information_schema.routine_privileges
--   WHERE  routine_name = 'try_use_word_lookup';
--   -- 期待: authenticated に EXECUTE。anon が無いこと
--
--   -- 既存のカウンターが無傷であること
--   SELECT proname FROM pg_proc
--   WHERE  proname IN ('try_use_translation','try_use_correction','try_use_audio_daily',
--                      'try_use_shadowing','try_use_recheck')
--   AND    pronamespace = 'public'::regnamespace ORDER BY 1;
--   -- 期待: 5行すべて


-- ============================================================
--  VERIFY — 使われ始めてから
-- ============================================================
--   -- 1日の引き数の分布。20 が締め出しになっていないかの確認
--   SELECT word_lookup_count, count(*) FROM public.word_lookup_usage
--   GROUP  BY 1 ORDER BY 1;
--   -- 上限20に到達した日が全体の数%を超えるようなら、上限を見直す
--
--   SELECT count(*) AS cached_words, count(DISTINCT lang) AS langs
--   FROM   public.word_lookup_cache;
--
--   -- よく引かれている語（キャッシュが効いている実感の確認）
--   SELECT query, lang, level, created_at FROM public.word_lookup_cache
--   ORDER  BY created_at DESC LIMIT 30;


-- ============================================================
--  ROLLBACK — ⚠️ 実行しないこと
-- ============================================================
-- 元に戻したいときだけ、以下のコメントを外して使う。通常の適用手順には
-- 含まれない。
--
--   DROP FUNCTION IF EXISTS public.try_use_word_lookup(uuid, date, integer);
--   DROP TABLE    IF EXISTS public.word_lookup_cache;
--   DROP TABLE    IF EXISTS public.word_lookup_usage;   -- ポリシーも一緒に消える
--
-- usage_limits / translation_count / try_use_translation / correction_count /
-- profiles には触れていないので、戻しても既存の課金・回数管理は無傷。


-- ============================================================
--  NOTE — キャッシュの保持
-- ============================================================
-- 自動削除は入れていない。1語1行で、辞書に載る語しか入らないので、放って
-- おいて困る速度では増えない。増えてきたら手で流す:
--   delete from public.word_lookup_cache where created_at < now() - interval '365 days';
-- ⚠️ 消すと、その語を次に引いた学習者が1回ぶんの枠を使う。急いで消す理由は
--    無い。
