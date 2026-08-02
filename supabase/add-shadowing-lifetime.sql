-- ============================================================
--  Nihongo Diary — 音読（シャドーイング）回数を「日次」から「生涯累計」へ
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑦ の順に1文ずつ実行する。
--
--  なぜ作るのか:
--    無料は体験版に徹し、フローを毎日回せるのは Plus 以上にする、という
--    方針変更による。日次のままだと無料で毎日1周できてしまい、課金する
--    理由が残らない。
--
--  ⚠️ 音声（audio）と違って、音読には「戻す先」が無い。
--    音声は add-audio-limit.sql で生涯版として作られ、後から
--    add-audio-daily.sql で日次に移った。だから旧テーブル public.audio_usage と
--    try_use_audio / refund_audio がそのまま残っており、アプリの参照先を
--    戻すだけで済む。
--    音読は add-shadowing-limit.sql で最初から日次として作られたので、
--    生涯版はこれまで一度も存在しない。このファイルが初出になる。
--
--  設計:
--    - 既存の public.shadowing_usage には一切触らない。列も足さないし
--      主キーも組み替えない。あちらは (user_id, usage_date) の複合主キーで、
--      既存行には日付が入っている。後から日付を捨てて畳むと、どの行を
--      残すのかという答えの無い問いが発生する。
--      新しいテーブルを作って /api/shadowing/use の参照先を差し替えるほうが、
--      いつでも元に戻せる。
--    - try_use_shadowing() にも触らない。無傷のまま残すことがロールバック
--      手段そのものになる（add-audio-daily.sql と同じ方針）。
--    - correction_count / translation_count / recheck_count は触らない。
--    - try_use_correction() / try_use_translation() / try_use_recheck() /
--      try_use_audio() / refund_audio() / normalizePlan / profiles / plan /
--      Stripe / streak / 既存トリガーには触らない。
--
--  ⚠️ 名前の非対称に注意。無印がどちらの単位かはテーブルごとに違う:
--        public.audio_usage            … 生涯累計（無印が生涯）
--        public.audio_usage_daily      … 日次
--        public.shadowing_usage        … 日次（無印が日次）
--        public.shadowing_usage_total  … 生涯累計 ← このファイル
--    音読だけ無印が日次なのは、音読が日次から始まったから。
--    紛らわしいので、生涯版には _total を付けて区別する。
--
--  ⚠️ 関数の引数に DEFAULT は付けない。Supabase の SQL Editor が
--    受け付けないことがあり、実際に一度失敗している。呼び出し側は
--    p_user_id / p_limit を必ず明示的に渡すこと。
--
--  上限値そのものはここに保存しない。呼び出し側が p_limit を渡す
--  — 既存の全 try_use_* と同じ流儀。
--
--  ⚠️ 既存データは消さない。shadowing_usage の行はそのまま残す。
--     切り替えた瞬間、新しいテーブルは空なので、日次時代にどれだけ
--     録音した学習者でも生涯3回が満タンの状態から始まる。これは意図した
--     結果そのもの。手順を戻せば以前の状態に復帰できる。
-- ============================================================


-- ============================================================
--  ① テーブル作成
-- ============================================================
-- user_id が主キー。1ユーザー1行だけ。
-- usage_date を持たない = 日付が変わっても増えたまま。
-- ON CONFLICT (user_id) の upsert は、この主キーを arbiter として使う。
-- public.audio_usage と同じ形。
--
-- on delete cascade も audio_usage と同じ。退会時に「このテーブルの行」は
-- 自動で消える。
--
-- ⚠️ ストレージは cascade の対象外。録音そのものは shadowing-audio
--    バケットにあり、/api/account/delete の STORAGE_BUCKETS が消す。
--    そちらは add-shadowing-audio.sql の責務で、このファイルとは無関係。
create table if not exists public.shadowing_usage_total (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  shadowing_count integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- ============================================================
--  ② RLS を有効化
-- ============================================================
-- 有効化した時点で、ポリシーが無い操作は全て拒否される。
-- つまり insert / update ポリシーを作らない限り、クライアントからの
-- 直接の書き込みは（本人であっても）通らない。これが狙い。
-- usage_limits には insert / update ポリシーがあるため流用しない、という
-- add-shadowing-limit.sql の判断をそのまま引き継ぐ。
alter table public.shadowing_usage_total enable row level security;


-- ============================================================
--  ③ select ポリシーを作り直す前に落とす（べき等化）
-- ============================================================
drop policy if exists "Users read own total shadowing usage" on public.shadowing_usage_total;


-- ============================================================
--  ④ select ポリシー — 本人の行だけ読める
-- ============================================================
-- 残り回数の表示に使う（/write の音読カード）。
-- 書き込み系のポリシーは意図的に作らない。
create policy "Users read own total shadowing usage"
  on public.shadowing_usage_total for select using (auth.uid() = user_id);


-- ============================================================
--  ⑤ 原子的な消費関数
-- ============================================================
-- 音読1回分を原子的に確保する。
-- TRUE  → 確保できた。呼び出し側は録音を受け付けてよい。
-- FALSE → 生涯の上限に到達済み。呼び出し側は 429 を返す。
--
-- INSERT ... ON CONFLICT DO UPDATE WHERE で「判定 + 加算」を1文にする
-- （try_use_audio と同じ形）。ON CONFLICT ハンドラ内の行ロックにより、
-- 上限ちょうどの境界で同時リクエストが2本とも通り抜けることがない。
--
-- SECURITY DEFINER なので RLS を通らない。②で insert / update ポリシーを
-- 作らなくても、この関数からの書き込みは正常に通る。
--
-- ⚠️ p_date は受け取らない。生涯累計なので日付の概念が無く、
--    タイムゾーンの考慮も不要になる。日次版 try_use_shadowing() との
--    最大の違いがここで、引数の数が違うため両者は共存できる。
--
-- ⚠️ 引数に DEFAULT を付けないこと（冒頭の警告を参照）。
create or replace function public.try_use_shadowing_total(
  p_user_id  uuid,
  p_limit    integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  -- Security: 認証ユーザー本人の分しか確保できない。
  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  -- ON CONFLICT の WHERE は「2回目以降」にしか効かないため、行がまだ無い
  -- ユーザーの初回だけは INSERT 側を通って必ず1回消費できてしまう。
  -- 生涯累計では「上限0のプランでも一生に1回は使える」という穴になるので
  -- 塞いでおく。try_use_audio が同じ理由で持っている1行と同じもの。
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;

  insert into public.shadowing_usage_total (user_id, shadowing_count, created_at, updated_at)
  values (p_user_id, 1, now(), now())
  on conflict (user_id) do update
    set shadowing_count = public.shadowing_usage_total.shadowing_count + 1,
        updated_at      = now()
  where public.shadowing_usage_total.shadowing_count < p_limit
  returning shadowing_count into v_new_count;

  -- WHERE 句が UPDATE を止めたとき v_new_count は NULL になる
  -- （＝このリクエストの前に既に上限へ到達していた）。
  return v_new_count is not null;
end;
$$;


-- ============================================================
--  ⑥ grant — try_use_shadowing_total
-- ============================================================
grant execute on function public.try_use_shadowing_total(uuid, integer)
  to authenticated;


-- ============================================================
--  ⑦ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
-- これを流すまで supabase.rpc("try_use_shadowing_total", ...) は解決できない。
-- 忘れると PGRST202 になり、/api/tts が try_use_audio_daily で落ちたときと
-- 同じ見え方になる。
notify pgrst, 'reload schema';


-- ============================================================
--  NOTE — 返金関数を作らない理由
-- ============================================================
-- /api/shadowing/use は「アップロードしてから確保する」順序になっている
-- （route.ts の persist フロー）。確保が成功した時点で録音は既に保存済みで、
-- 「確保したのに渡せなかった」状態が発生しない。
-- 日次版 add-shadowing-limit.sql も同じ理由で返金関数を持っていない。
--
-- 音声（refund_audio）に返金があるのは、確保のあとに Google TTS の呼び出しが
-- 控えていて、そこが失敗しうるため。音読には対応する外部呼び出しが無い。


-- ============================================================
--  VERIFY（①〜⑦ を流したあとに実行）
-- ============================================================
-- (1) テーブルの構造
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'shadowing_usage_total'
--   ORDER BY ordinal_position;
--   期待: user_id(uuid,NO) / shadowing_count(integer,NO,0)
--         created_at(timestamptz,NO,now()) / updated_at(timestamptz,NO,now())
--
-- (2) 主キーが user_id 単独であること
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid = 'public.shadowing_usage_total'::regclass;
--   期待: PRIMARY KEY (user_id) と auth.users への FOREIGN KEY
--   ⚠️ (user_id, usage_date) の複合になっていたら日次版と取り違えている。
--
-- (3) RLS が有効で、ポリシーは select の1本だけ
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid = 'public.shadowing_usage_total'::regclass;            -- 期待: true
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='shadowing_usage_total';
--   期待: 1行のみ → "Users read own total shadowing usage" / SELECT
--
-- (4) FORCE RLS が掛かっていないこと（掛かっていると RPC が書けなくなる）
--   SELECT relforcerowsecurity FROM pg_class
--   WHERE oid = 'public.shadowing_usage_total'::regclass;            -- 期待: false
--
-- (5) 関数が SECURITY DEFINER で、authenticated から実行可能
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS can_execute
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname='public' AND p.proname = 'try_use_shadowing_total';
--   期待: 1行、prosecdef = true, can_execute = true
--
-- (6) 引数に DEFAULT が付いていないこと
--   SELECT p.proname, pg_get_function_arguments(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname='public' AND p.proname = 'try_use_shadowing_total';
--   期待: "p_user_id uuid, p_limit integer"（"DEFAULT" の文字が無いこと）
--
-- (7) 既存が無傷であることの確認（触っていないので変化ゼロが期待値）
--   SELECT count(*) FROM public.shadowing_usage;
--   期待: 実行前と同じ件数。日次版の実績は消していない。
--
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname LIKE 'try_use_%' ORDER BY proname;
--   期待: try_use_audio, try_use_audio_daily, try_use_correction,
--         try_use_recheck, try_use_shadowing, try_use_shadowing_total,
--         try_use_translation
--   ⚠️ try_use_shadowing が消えていたらロールバック手段を失っている。
--
--   SELECT count(*) FROM public.audio_usage;
--   期待: 51。音声の生涯版はこのファイルでは一切触っていない。
--
-- NOTE: SQL Editor から try_use_shadowing_total() を直接呼ぶと必ず FALSE が
--       返る。エディタでは auth.uid() が NULL なので所有者チェックで弾かれる
--       ため。既存の全 try_use_* と同じ想定内の挙動。動作確認は
--       /api/shadowing/use が切り替わってから。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- ⚠️ 本当のロールバックは SQL ではなくアプリ側で行う。
--    /api/shadowing/use と /write の参照先を try_use_shadowing /
--    shadowing_usage に戻せば、それだけで日次の挙動に復帰する。
--    日次テーブルも日次関数も無傷のまま残っているので、データの復元作業は
--    要らない。
--
-- そのうえで新しいものを消したい場合:
--   DROP FUNCTION IF EXISTS public.try_use_shadowing_total(uuid, integer);
--   DROP TABLE IF EXISTS public.shadowing_usage_total;   -- ポリシーも一緒に消える
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ ロールバックしても usage_limits / audio_usage / audio_usage_daily /
--    shadowing_usage と既存の全 try_use_* には影響しない
--    （このファイルは一度も触っていないため）。
-- ============================================================
