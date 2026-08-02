-- ============================================================
--  Nihongo Diary — 音声（TTS）回数を「生涯累計」から「日次」へ
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑨ の順に1文ずつ実行する。
--
--  なぜ作り替えるのか:
--    生涯3回では1日の学習の流れ（聞く → 音読 → 書き取り → 翌日もう一度）が
--    3日で終わり、以降は毎日「使えません」になる。毎日1周できることが
--    流れの前提なので、単位を日次にする。
--
--  設計:
--    - 既存の public.audio_usage には一切触らない。列も足さないし
--      主キーも組み替えない。あちらは生涯累計用に user_id だけを主キーに
--      しており、既存行に日付が入っていないため、後から usage_date を
--      足しても意味のある値を入れられない。
--      新しいテーブルを作って /api/tts の参照先を差し替えるほうが、
--      いつでも元に戻せる。
--    - try_use_audio() / refund_audio() にも触らない。無傷のまま残すことが
--      ロールバック手段そのものになる。
--    - usage_limits には触らない（unique(user_id, usage_date) の日次テーブル
--      だが、select / insert / update の3ポリシーがあるため、クライアントから
--      自分のカウントを0に戻せてしまう。音声は audio_usage / shadowing_usage と
--      同じく select だけを開ける）。
--    - correction_count / translation_count / recheck_count は触らない。
--    - try_use_correction() / try_use_translation() / try_use_recheck() /
--      try_use_shadowing() / normalizePlan / profiles / plan / Stripe /
--      streak / 既存トリガーには触らない。
--
--  上限値そのものはここに保存しない。呼び出し側が p_limit を渡す
--  — 既存の4関数と同じ流儀。
--
--  ⚠️ 既存データは消さない。audio_usage の行はそのまま残す。
--     切り替えた瞬間、生涯3回を使い切っていた Free の学習者は制限が解ける。
--     これは意図した結果そのもの。過去の消費実績は履歴として残り、
--     手順を戻せば以前の状態に復帰できる。
-- ============================================================


-- ============================================================
--  ① テーブル作成
-- ============================================================
-- 主キーは (user_id, usage_date) の複合。これが同時に
-- unique(user_id, usage_date) 制約であり、⑤の ON CONFLICT が arbiter として
-- 使う対象でもある。shadowing_usage と同じ形。
--
-- 主キーの先頭列が user_id なので「あるユーザーの今日の行」の探索は
-- 主キーインデックスだけで済む。追加のインデックスは要らない。
create table if not exists public.audio_usage_daily (
  user_id     uuid not null references auth.users (id) on delete cascade,
  usage_date  date not null,
  audio_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, usage_date)
);


-- ============================================================
--  ② RLS を有効化
-- ============================================================
-- 有効化した時点で、ポリシーが無い操作は全て拒否される。
-- insert / update ポリシーを作らない限り、クライアントからの直接の
-- 書き込みは（本人であっても）通らない。
alter table public.audio_usage_daily enable row level security;


-- ============================================================
--  ③ select ポリシーを作り直す前に落とす（べき等化）
-- ============================================================
drop policy if exists "Users read own daily audio usage" on public.audio_usage_daily;


-- ============================================================
--  ④ select ポリシー — 本人の行だけ読める
-- ============================================================
-- 残り回数の表示に使う（/dictation/[id] と、これから作る画面）。
create policy "Users read own daily audio usage"
  on public.audio_usage_daily for select using (auth.uid() = user_id);


-- ============================================================
--  ⑤ 原子的な消費関数
-- ============================================================
-- 音声1回分を原子的に確保する。
-- TRUE  → 確保できた。呼び出し側は Google TTS を叩いてよい。
-- FALSE → その日の上限に到達済み。呼び出し側は 429 を返す。
--
-- ⚠️ 呼び出し側の順序は変えないこと。/api/tts はキャッシュ照合を
--    この関数の呼び出しより上で行っている（route.ts:160-164）。
--    キャッシュヒットはカウント対象外 — 過去に翻訳 API が
--    キャッシュヒットで課金してしまった事故があり、その順序が再発防止策。
--    日次にしてもこの前提は変わらない。むしろ重要度が上がる:
--    同じ文を音読・書き取り1回目・書き取り2回目で繰り返し再生する設計なので、
--    キャッシュヒットが無料でないと1日1回では回らない。
--
-- ⚠️ p_date は必ず呼び出し側から渡すこと。この関数の中で current_date を
--    使ってはいけない。current_date は DB のタイムゾーン（UTC）基準になり、
--    日本の学習者は朝9時に日付が変わる。呼び出し側は
--      new Date().toLocaleDateString("en-CA", { timeZone: tz })
--    で計算する（api/correct/route.ts:365、api/shadowing/use と同じ）。
create or replace function public.try_use_audio_daily(
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
  -- Security: 認証ユーザー本人の分しか確保できない。
  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  -- ⚠️ 日次テーブルでは必須の3行。
  -- ON CONFLICT の WHERE は「同じ (user_id, usage_date) の2回目以降」に
  -- しか効かない。日次ではその日の最初のリクエストが必ず INSERT 側を通るため、
  -- この guard が無いと上限0のプランでも毎日1回使えてしまう。
  -- （生涯累計だった audio_usage では同じ穴でも「一生に1回」で済んでいた。）
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;

  insert into public.audio_usage_daily (user_id, usage_date, audio_count, created_at, updated_at)
  values (p_user_id, p_date, 1, now(), now())
  on conflict (user_id, usage_date) do update
    set audio_count = public.audio_usage_daily.audio_count + 1,
        updated_at  = now()
  where public.audio_usage_daily.audio_count < p_limit
  returning audio_count into v_new_count;

  -- WHERE 句が UPDATE を止めたとき v_new_count は NULL になる
  -- （＝このリクエストの前に既にその日の上限へ到達していた）。
  return v_new_count is not null;
end;
$$;


-- ============================================================
--  ⑥ 返金関数
-- ============================================================
-- 確保した音声1回分を戻す。Google TTS のエラー、音声が空で返ってきた等、
-- 「確保したのに音声を渡せなかった」ときにアプリ側から呼ぶ
-- （/api/tts:229 の経路。日次にしても残る）。
--
-- ⚠️ 生涯版の refund_audio(uuid) と引数が違う。日次テーブルは行が日付ごとに
--    分かれているので、どの日の行を戻すのかを渡さないと特定できない。
--
-- ⚠️ 呼び出し側は、確保に使ったのと同じ p_date を渡すこと。
--    今日の日付を2回計算すると、日付の変わり目をまたいだ瞬間に
--    「昨日確保して今日返金する」ことが起こりうる。ルート内で1度だけ
--    計算した値を、確保と返金の両方で使い回す。
--
-- greatest(..., 0) で 0 未満にはならない。行が無ければ何も起きない。
create or replace function public.refund_audio_daily(
  p_user_id uuid,
  p_date    date
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

  update public.audio_usage_daily
  set audio_count = greatest(audio_count - 1, 0),
      updated_at  = now()
  where user_id = p_user_id and usage_date = p_date;
end;
$$;


-- ============================================================
--  ⑦ grant — try_use_audio_daily
-- ============================================================
grant execute on function public.try_use_audio_daily(uuid, date, integer)
  to authenticated;


-- ============================================================
--  ⑧ grant — refund_audio_daily
-- ============================================================
grant execute on function public.refund_audio_daily(uuid, date)
  to authenticated;


-- ============================================================
--  ⑨ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑨ を流したあとに実行）
-- ============================================================
-- (1) テーブルの構造
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'audio_usage_daily'
--   ORDER BY ordinal_position;
--   期待: user_id(uuid,NO) / usage_date(date,NO) / audio_count(integer,NO,0)
--         created_at(timestamptz,NO,now()) / updated_at(timestamptz,NO,now())
--
-- (2) 主キーが (user_id, usage_date) であること
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid = 'public.audio_usage_daily'::regclass;
--   期待: PRIMARY KEY (user_id, usage_date) と auth.users への FOREIGN KEY
--   ⚠️ PRIMARY KEY が (user_id) だけなら生涯版と同じ形になってしまっている。
--
-- (3) RLS が有効で、ポリシーは select の1本だけ
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid = 'public.audio_usage_daily'::regclass;              -- 期待: true
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='audio_usage_daily';
--   期待: 1行のみ → "Users read own daily audio usage" / SELECT
--
-- (4) FORCE RLS が掛かっていないこと（掛かっていると RPC が書けなくなる）
--   SELECT relforcerowsecurity FROM pg_class
--   WHERE oid = 'public.audio_usage_daily'::regclass;              -- 期待: false
--
-- (5) 関数が SECURITY DEFINER で、authenticated から実行可能
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS can_execute
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname='public'
--     AND p.proname IN ('try_use_audio_daily','refund_audio_daily');
--   期待: 2行とも prosecdef = true, can_execute = true
--
-- (6) 既存が無傷であることの確認（触っていないので変化ゼロが期待値）
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='audio_usage'
--   ORDER BY ordinal_position;
--   期待: user_id, audio_count, created_at, updated_at（変化なし）
--
--   SELECT count(*) FROM public.audio_usage;
--   期待: 実行前と同じ件数。生涯版の実績は消していない。
--
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname LIKE 'try_use_%' ORDER BY proname;
--   期待: try_use_audio, try_use_audio_daily, try_use_correction,
--         try_use_recheck, try_use_shadowing, try_use_translation
--   ⚠️ try_use_audio が消えていたらロールバック手段を失っている。
--
-- NOTE: SQL Editor から try_use_audio_daily() を直接呼ぶと必ず FALSE が返る。
--       エディタでは auth.uid() が NULL なので所有者チェックで弾かれるため。
--       既存の全 try_use_* と同じ想定内の挙動。動作確認はステップ2で
--       /api/tts が切り替わってから。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- ⚠️ 本当のロールバックは SQL ではなくアプリ側で行う。
--    /api/tts と /dictation/[id] の参照先を try_use_audio / audio_usage に
--    戻せば、それだけで生涯3回の挙動に復帰する。旧テーブルも旧関数も
--    無傷のまま残っているので、データの復元作業は要らない。
--
-- そのうえで新しいものを消したい場合:
--   DROP FUNCTION IF EXISTS public.try_use_audio_daily(uuid, date, integer);
--   DROP FUNCTION IF EXISTS public.refund_audio_daily(uuid, date);
--   DROP TABLE IF EXISTS public.audio_usage_daily;   -- ポリシーも一緒に消える
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ ロールバックしても usage_limits / audio_usage / shadowing_usage と
--    既存5関数には影響しない（このファイルは一度も触っていないため）。


-- ============================================================
--  NOTE — audio_usage を消さない理由
-- ============================================================
-- 1. ロールバック手段そのものだから。アプリの参照先を戻すだけで
--    以前の挙動に復帰でき、消してしまうとその道が絶たれる。
--
-- 2. 生涯累計の実績が「その学習者が音声機能をどれだけ使ったか」の
--    唯一の記録だから。日次テーブルは今日の分しか持たない。
--
-- 3. 消す実利が無いから。1ユーザー1行の小さなテーブルで、
--    放置してもコストがほぼゼロ。
--
-- ⚠️ 逆に、切り替え後に audio_usage へ書き込みが続いていないかは
--    確認したほうがよい。/api/tts が両方を叩いていたら、
--    切り替えが中途半端という意味になる:
--      SELECT max(updated_at) FROM public.audio_usage;
--    切り替え後はこの値が動かなくなるのが正しい。
-- ============================================================
