-- ============================================================
--  Nihongo Diary — 音声（TTS）回数の生涯累計カウンター
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑨ の順に1文ずつ実行する。
--
--  設計:
--    - 新規テーブル public.audio_usage を追加するだけ。
--    - usage_limits には一切触らない。
--      （usage_limits は unique(user_id, usage_date) の「日次」テーブル。
--        音声は日次リセットではなく生涯累計なので構造が合わない。
--        列を足すのではなく別テーブルにするのが正しい。）
--    - correction_count / translation_count / recheck_count は触らない。
--    - try_use_correction() / try_use_translation() / try_use_recheck() /
--      refund_correction() は触らない。このファイルは
--      「新しいテーブル1つ + 新しい関数2つ」を ADD するだけ。
--    - profiles / plan / Stripe / streak には触らない。
--    - 既存のトリガーは追加も変更もしない
--      （updated_at は関数側で明示的に now() を入れる）。
--
--  上限値そのものはここに保存しない。呼び出し側が p_limit を渡す
--  — correction / translation / recheck の3関数と同じ流儀。
--  プラン別の配分を後から変えてもマイグレーション不要。
--
--  RLS の方針（usage_limits とは意図的に変えている）:
--    select ポリシーのみを作り、insert / update ポリシーは作らない。
--    書き込みは SECURITY DEFINER の RPC 2本だけに限定され、
--    クライアントから audio_count を直接書き戻すことはできない。
--    詳細は末尾の NOTE を参照。
-- ============================================================


-- ============================================================
--  ① テーブル作成
-- ============================================================
-- user_id が主キー。1ユーザー1行だけ。
-- usage_limits と違い usage_date を持たない = 日付が変わっても増えたまま。
-- ON CONFLICT (user_id) の upsert は、この主キーを arbiter として使う。
create table if not exists public.audio_usage (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  audio_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ============================================================
--  ② RLS を有効化
-- ============================================================
-- 有効化した時点で、ポリシーが無い操作は全て拒否される。
-- つまり insert / update ポリシーを作らない限り、クライアントからの
-- 直接の書き込みは（本人であっても）通らない。これが今回の狙い。
alter table public.audio_usage enable row level security;


-- ============================================================
--  ③ select ポリシーを作り直す前に落とす（べき等化）
-- ============================================================
drop policy if exists "Users read own audio usage" on public.audio_usage;


-- ============================================================
--  ④ select ポリシー — 本人の行だけ読める
-- ============================================================
-- 残り回数の表示に使う。書き込み系のポリシーは意図的に作らない。
create policy "Users read own audio usage"
  on public.audio_usage for select using (auth.uid() = user_id);


-- ============================================================
--  ⑤ 原子的な消費関数
-- ============================================================
-- 音声1回分を原子的に確保する。
-- TRUE  → 確保できた。呼び出し側は Google TTS を叩いてよい。
-- FALSE → 生涯上限に到達済み。呼び出し側は 429 を返す。
--
-- INSERT ... ON CONFLICT DO UPDATE WHERE で「判定 + 加算」を1文にする
-- （try_use_correction / try_use_translation / try_use_recheck と同じ形）。
-- ON CONFLICT ハンドラ内の行ロックにより、上限ちょうどの境界で同時リクエストが
-- 2本とも通り抜けることがない。
--
-- SECURITY DEFINER なので RLS を通らない。②で insert / update ポリシーを
-- 作らなくても、この関数からの書き込みは正常に通る。
create or replace function public.try_use_audio(
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

  -- 既存3関数には無い1行（意図的な追加）。
  -- ON CONFLICT の WHERE は「2回目以降」にしか効かないため、行がまだ無い
  -- ユーザーの初回だけは INSERT 側を通って必ず1回消費できてしまう。
  -- 日次テーブルなら「1日1回」で済むが、生涯累計では
  -- 「上限0のプランでも一生に1回は使える」という穴になるので塞いでおく。
  -- 将来 Free を音声0回にする可能性があるため残してある。
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;

  insert into public.audio_usage (user_id, audio_count, created_at, updated_at)
  values (p_user_id, 1, now(), now())
  on conflict (user_id) do update
    set audio_count = public.audio_usage.audio_count + 1,
        updated_at  = now()
  where public.audio_usage.audio_count < p_limit
  returning audio_count into v_new_count;

  -- WHERE 句が UPDATE を止めたとき v_new_count は NULL になる
  -- （＝このリクエストの前に既に上限へ到達していた）。
  return v_new_count is not null;
end;
$$;


-- ============================================================
--  ⑥ 返金関数
-- ============================================================
-- 確保した音声1回分を戻す。refund_correction() と同じ形。
-- Google TTS のエラー、音声が空で返ってきた、保存に失敗した等、
-- 「確保したのに音声を渡せなかった」ときにアプリ側から呼ぶ。
--
-- greatest(..., 0) で 0 未満にはならない。行が無ければ何も起きない
-- （UPDATE が0行にマッチするだけでエラーにならない）。
-- こちらも SECURITY DEFINER なので update ポリシー不要で動く。
create or replace function public.refund_audio(
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Security: 認証ユーザー本人の分しか戻せない。
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  update public.audio_usage
  set audio_count = greatest(audio_count - 1, 0),
      updated_at  = now()
  where user_id = p_user_id;
end;
$$;


-- ============================================================
--  ⑦ grant — try_use_audio
-- ============================================================
grant execute on function public.try_use_audio(uuid, integer) to authenticated;


-- ============================================================
--  ⑧ grant — refund_audio
-- ============================================================
grant execute on function public.refund_audio(uuid) to authenticated;


-- ============================================================
--  ⑨ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
-- これを流すまで supabase.rpc("try_use_audio", ...) は解決できない。
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑨ を流したあとに実行）
-- ============================================================
-- (1) テーブルの構造
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'audio_usage'
--   ORDER BY ordinal_position;
--   期待: user_id(uuid,NO) / audio_count(integer,NO,0)
--         created_at(timestamptz,NO,now()) / updated_at(timestamptz,NO,now())
--
-- (2) user_id が主キーであること（ON CONFLICT (user_id) の前提）
--   SELECT conname, contype, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.audio_usage'::regclass;
--   期待: PRIMARY KEY (user_id) と auth.users への FOREIGN KEY
--
-- (3) RLS が有効で、ポリシーは select の1本だけ
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid = 'public.audio_usage'::regclass;                  -- 期待: true
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'audio_usage';
--   期待: 1行のみ → "Users read own audio usage" / SELECT
--   ⚠️ ここが2行以上なら、insert か update のポリシーが混入している。
--
-- (4) FORCE RLS が掛かっていないこと（掛かっていると RPC が書けなくなる）
--   SELECT relforcerowsecurity FROM pg_class
--   WHERE oid = 'public.audio_usage'::regclass;                  -- 期待: false
--
-- (5) 関数が SECURITY DEFINER で、authenticated から実行可能
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS can_execute
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname IN ('try_use_audio','refund_audio');
--   期待: 2行とも prosecdef = true, can_execute = true
--
-- (6) 既存が無傷であることの確認（触っていないので変化ゼロが期待値）
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usage_limits'
--   ORDER BY ordinal_position;
--   期待: id, user_id, usage_date, correction_count, native_count,
--         created_at, updated_at, translation_count, recheck_count
--         （順序は環境により前後する。audio 系の列が増えていないことが要点）
--
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname LIKE 'try_use_%' ORDER BY proname;
--   期待: try_use_audio, try_use_correction, try_use_recheck, try_use_translation
--
-- NOTE: SQL Editor から try_use_audio() を直接呼ぶと必ず FALSE が返る。
--       エディタでは auth.uid() が NULL なので所有者チェックで弾かれるため。
--       これは想定通りで、try_use_correction / try_use_translation /
--       try_use_recheck と同じ挙動。動作確認はステップ2でルートが載ってから。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- 関数だけ落とす（テーブルと消費実績は残る）:
--   DROP FUNCTION IF EXISTS public.try_use_audio(uuid, integer);
--   DROP FUNCTION IF EXISTS public.refund_audio(uuid);
--   NOTIFY pgrst, 'reload schema';
--
-- 完全に元に戻す（今までの消費カウントも破棄される）:
--   DROP TABLE IF EXISTS public.audio_usage;   -- ポリシーも一緒に消える
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ ロールバックしても usage_limits と既存3関数には影響しない
--    （このファイルは一度も触っていないため）。


-- ============================================================
--  NOTE — RLS を usage_limits と変えた点
-- ============================================================
-- usage_limits には select / insert / update の3本があるため、
-- クライアントから
--   supabase.from("usage_limits").update({ correction_count: 0 })
-- を直接叩けば自分のカウントを0に戻せてしまう。
--
-- audio_usage では select しか作らないので、この穴が無い。
-- RLS 有効かつポリシー未定義の操作は拒否されるため、insert / update は
-- 本人であってもクライアントからは通らない。書き込み経路は
-- try_use_audio() / refund_audio() の2本だけになる。
--
-- 両関数は SECURITY DEFINER で、所有者（テーブルの所有者でもある）として
-- 実行されるため RLS の対象外。だから update ポリシーが無くても書ける。
--
-- ⚠️ 唯一の注意点: このテーブルに
--      ALTER TABLE public.audio_usage FORCE ROW LEVEL SECURITY;
--    を掛けると所有者にも RLS が適用され、2つの RPC が書き込めなくなる
--    （消費が常に FALSE になる）。掛けないこと。VERIFY (4) で確認できる。
--
-- 既存テーブルの挙動は変えていない。usage_limits のポリシーはそのまま。
-- ============================================================
