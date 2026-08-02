-- ============================================================
--  Nihongo Diary — 音読（シャドーイング）回数の日次カウンター
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑦ の順に1文ずつ実行する。
--
--  設計:
--    - 新規テーブル public.shadowing_usage を追加するだけ。
--    - usage_limits には一切触らない。
--      （列を足す道もあったが、usage_limits は select / insert / update の
--        3ポリシーを持つため、クライアントから自分のカウントを直接0に
--        戻せてしまう。音読は新テーブルにして select だけを開ける。
--        詳細は末尾の NOTE を参照。）
--    - audio_usage / try_use_audio / refund_audio には触らない
--      （それらは add-audio-limit.sql の担当。音読は再生とは
--        別カウンターにする — 理由は末尾の NOTE を参照）。
--    - correction_count / translation_count / recheck_count は触らない。
--    - try_use_correction() / try_use_translation() / try_use_recheck() /
--      refund_correction() は触らない。このファイルは
--      「新しいテーブル1つ + 新しい関数1つ」を ADD するだけ。
--    - profiles / plan / normalizePlan / Stripe / streak には触らない。
--    - 既存のトリガーは追加も変更もしない
--      （updated_at は関数側で明示的に now() を入れる）。
--
--  ⚠️ 単位: これは日次カウンターで、audio_usage（生涯累計）とは違う。
--     音読は Google TTS を叩かないので外部 API の従量課金が発生せず、
--     生涯N回に絞る根拠が無い。毎日声に出す習慣を作るのが目的なので
--     日次にしている。
--     （録音した音声は保存する方針。ストレージは消費するが、これは
--       蓄積コストであって1回ごとの従量課金ではない。保存先バケットと
--       パスの管理はこのファイルの担当ではない — 別ファイルで扱う。）
--
--  上限値そのものはここに保存しない。呼び出し側が p_limit を渡す
--  — correction / translation / recheck の3関数と同じ流儀。
--  「1日1回」を後から「1日3回」に変えてもマイグレーション不要。
-- ============================================================


-- ============================================================
--  ① テーブル作成
-- ============================================================
-- 主キーは (user_id, usage_date) の複合。これが同時に
-- unique(user_id, usage_date) 制約であり、⑤の ON CONFLICT が
-- arbiter として使う対象でもある。usage_limits のような代理キー(id)は
-- 置かない — 新規テーブルなので自然キーで足りる。
--
-- usage_date は date 型で、呼び出し側が学習者のタイムゾーンで計算した
-- 日付を渡す。詳細は⑤の警告を参照。
--
-- 主キーの先頭列が user_id なので「あるユーザーの今日の行」の探索は
-- 主キーインデックスだけで済む。追加のインデックスは要らない。
--
-- on delete cascade は audio_usage と同じ。退会時に「このテーブルの行」は
-- 自動で消える。
--
-- ⚠️ ただしストレージは cascade の対象外。録音した音声を保存する以上、
--    /api/account/delete の STORAGE_BUCKETS（route.ts:15）に保存先バケットを
--    追加しないと、退会後も音声が residual data として残る。これは
--    このファイルではなくバケット追加のマイグレーション側の責務だが、
--    忘れると発覚しにくいのでここにも書いておく。
create table if not exists public.shadowing_usage (
  user_id         uuid not null references auth.users (id) on delete cascade,
  usage_date      date not null,
  shadowing_count integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, usage_date)
);


-- ============================================================
--  ② RLS を有効化
-- ============================================================
-- 有効化した時点で、ポリシーが無い操作は全て拒否される。
-- つまり insert / update ポリシーを作らない限り、クライアントからの
-- 直接の書き込みは（本人であっても）通らない。これが今回の狙い。
alter table public.shadowing_usage enable row level security;


-- ============================================================
--  ③ select ポリシーを作り直す前に落とす（べき等化）
-- ============================================================
drop policy if exists "Users read own shadowing usage" on public.shadowing_usage;


-- ============================================================
--  ④ select ポリシー — 本人の行だけ読める
-- ============================================================
-- 「今日はもう音読した」の表示に使う。書き込み系のポリシーは意図的に
-- 作らない。
create policy "Users read own shadowing usage"
  on public.shadowing_usage for select using (auth.uid() = user_id);


-- ============================================================
--  ⑤ 原子的な消費関数
-- ============================================================
-- 音読1回分を原子的に確保する。
-- TRUE  → 確保できた。呼び出し側は録音を受け付けてよい。
-- FALSE → その日の上限に到達済み。呼び出し側は 429 を返す。
--
-- INSERT ... ON CONFLICT DO UPDATE WHERE で「判定 + 加算」を1文にする
-- （try_use_correction / try_use_translation / try_use_recheck と同じ形）。
-- ON CONFLICT ハンドラ内の行ロックにより、上限ちょうどの境界で同時
-- リクエストが2本とも通り抜けることがない。
--
-- SECURITY DEFINER なので RLS を通らない。②で insert / update ポリシーを
-- 作らなくても、この関数からの書き込みは正常に通る。
--
-- ⚠️ p_date は必ず呼び出し側から渡すこと。この関数の中で current_date を
--    使ってはいけない。current_date は DB のタイムゾーン（UTC）基準に
--    なるため、日本の学習者にとっては朝9時に日付が変わる。既存の3関数も
--    同じ理由で p_date を受け取っており、呼び出し側は
--      new Date().toLocaleDateString("en-CA", { timeZone: tz })
--    で計算する（src/app/api/correct/route.ts:365 と同じ）。tz は
--    user_tz cookie →（UTC なら）profiles.timezone の順で解決する。
create or replace function public.try_use_shadowing(
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

  -- ⚠️ この3行は日次テーブルでは特に重要。
  -- ON CONFLICT の WHERE は「同じ (user_id, usage_date) の2回目以降」に
  -- しか効かない。日次テーブルではその日の最初のリクエストが必ず
  -- INSERT 側を通るため、この guard が無いと p_limit = 0 のプランでも
  -- 「毎日1回だけは使える」という穴になる。
  -- （audio_usage は生涯累計なので、同じ穴でも「一生に1回」で済んでいた。）
  if p_limit is null or p_limit <= 0 then
    return false;
  end if;

  insert into public.shadowing_usage (user_id, usage_date, shadowing_count, created_at, updated_at)
  values (p_user_id, p_date, 1, now(), now())
  on conflict (user_id, usage_date) do update
    set shadowing_count = public.shadowing_usage.shadowing_count + 1,
        updated_at      = now()
  where public.shadowing_usage.shadowing_count < p_limit
  returning shadowing_count into v_new_count;

  -- WHERE 句が UPDATE を止めたとき v_new_count は NULL になる
  -- （＝このリクエストの前に既にその日の上限へ到達していた）。
  return v_new_count is not null;
end;
$$;


-- ============================================================
--  ⑥ grant — try_use_shadowing
-- ============================================================
grant execute on function public.try_use_shadowing(uuid, date, integer)
  to authenticated;


-- ============================================================
--  ⑦ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
-- これを流すまで supabase.rpc("try_use_shadowing", ...) は解決できない。
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑦ を流したあとに実行）
-- ============================================================
-- (1) テーブルの構造
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'shadowing_usage'
--   ORDER BY ordinal_position;
--   期待: user_id(uuid,NO) / usage_date(date,NO)
--         shadowing_count(integer,NO,0)
--         created_at(timestamptz,NO,now()) / updated_at(timestamptz,NO,now())
--
-- (2) 主キーが (user_id, usage_date) であること
--     （⑤の ON CONFLICT (user_id, usage_date) の前提）
--   SELECT conname, contype, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.shadowing_usage'::regclass;
--   期待: PRIMARY KEY (user_id, usage_date) と auth.users への FOREIGN KEY
--   ⚠️ PRIMARY KEY が (user_id) だけなら1人1行になってしまっている。
--      その場合はテーブルを作り直すこと（ROLLBACK 参照）。
--
-- (3) RLS が有効で、ポリシーは select の1本だけ
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid = 'public.shadowing_usage'::regclass;                -- 期待: true
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'shadowing_usage';
--   期待: 1行のみ → "Users read own shadowing usage" / SELECT
--   ⚠️ ここが2行以上なら、insert か update のポリシーが混入している。
--
-- (4) FORCE RLS が掛かっていないこと（掛かっていると RPC が書けなくなる）
--   SELECT relforcerowsecurity FROM pg_class
--   WHERE oid = 'public.shadowing_usage'::regclass;                -- 期待: false
--
-- (5) 関数が SECURITY DEFINER で、authenticated から実行可能
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') AS can_execute
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'try_use_shadowing';
--   期待: 1行、prosecdef = true, can_execute = true
--
-- (6) 既存が無傷であることの確認（触っていないので変化ゼロが期待値）
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usage_limits'
--   ORDER BY ordinal_position;
--   期待: id, user_id, usage_date, correction_count, native_count,
--         created_at, updated_at, translation_count, recheck_count
--         （順序は環境により前後する。shadowing 系の列が増えていないことが要点）
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='audio_usage'
--   ORDER BY ordinal_position;
--   期待: user_id, audio_count, created_at, updated_at（変化なし）
--
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND proname LIKE 'try_use_%' ORDER BY proname;
--   期待: try_use_audio, try_use_correction, try_use_recheck,
--         try_use_shadowing, try_use_translation
--
-- NOTE: SQL Editor から try_use_shadowing() を直接呼ぶと必ず FALSE が返る。
--       エディタでは auth.uid() が NULL なので所有者チェックで弾かれるため。
--       これは想定通りで、try_use_audio / try_use_correction /
--       try_use_translation / try_use_recheck と同じ挙動。
--       動作確認はステップ2で /api/shadowing/use が載ってから。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- 関数だけ落とす（テーブルと消費実績は残る）:
--   DROP FUNCTION IF EXISTS public.try_use_shadowing(uuid, date, integer);
--   NOTIFY pgrst, 'reload schema';
--
-- 完全に元に戻す（今までの消費カウントも破棄される）:
--   DROP TABLE IF EXISTS public.shadowing_usage;   -- ポリシーも一緒に消える
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ ロールバックしても usage_limits / audio_usage と既存4関数には
--    影響しない（このファイルは一度も触っていないため）。
--
-- ⚠️ このテーブルを落としても、保存済みの音声ファイルは消えない。
--    ここにあるのは「その日もう使ったか」の判定に使うカウントだけで、
--    音声そのものはストレージ側にある。音声まで消したい場合は
--    バケット側のロールバックを別途行うこと。


-- ============================================================
--  NOTE — なぜ audio_usage を流用しないのか
-- ============================================================
-- audio_usage は /api/tts の再生に紐づく生涯累計カウンターで、
-- Free は生涯3回。ここに音読を相乗りさせると、学習者の自然な動線
-- 「🔊で聞く → 真似して声に出す」が 1回の音読で 2クレジットを
-- 消費することになり、生涯3回のうち2回が初回の音読で消える。
--
-- また audio_usage.audio_count は列が1つしかないため、後から
-- 「再生ぶん」と「音読ぶん」に分離することができない。
--
-- 単位も違う。TTS は再生1回ごとに Google へ実費が出るので生涯上限に
-- 意味がある。音読は外部 API を叩かない。ストレージは消費するが、それは
-- 1回ごとの従量課金ではなく蓄積量の問題で、上限ではなく保存期間で
-- 制御すべきもの。したがって日次が正しい。
--
-- ⚠️ したがって、この2つのカウンターを後から統合しないこと。
--    /api/tts のカウント管理とキャッシュは変更禁止でもある。


-- ============================================================
--  NOTE — なぜ返金関数を作らないのか
-- ============================================================
-- refund_audio が存在するのは、try_use_audio で確保したあとに
-- Google TTS が失敗すると「金を払っていないのにクレジットだけ減る」
-- からで、返すべき実費がある。
--
-- 音読にはそれが無い。順序を
--
--     ① 録音完了（blob ができる）
--     ② ストレージへアップロード成功
--     ③ この関数でカウント
--
-- と決めているため、「確保したのに渡せなかった」区間が存在しない。
-- マイクを拒否された、録音を取りやめた、アップロードが失敗した——
-- いずれの場合もこの関数はまだ呼ばれていない。
--
-- ③で FALSE が返った場合（＝その日の上限に既に到達）だけ、②で上げた
-- ファイルが宙に浮く。パスは日記ごとに固定で次回の録音が上書きするため
-- 孤児は増え続けない。UI 側が残り回数を先に表示するので、この経路に
-- 入ること自体が稀。
--
-- ⚠️ 順序を「カウント → アップロード」に変えるなら、この前提は崩れる。
--    アップロード失敗でカウントだけ減るので、その場合は
--    refund_audio と同じ形の refund_shadowing を足すこと。
--    （/api/tts が claim → synthesize → 失敗なら refund という
--      順序なのは、Google への実費が先に確定しないためで、
--      ストレージへの自前アップロードとは事情が違う。）


-- ============================================================
--  NOTE — RLS を usage_limits と変えた点
-- ============================================================
-- usage_limits には select / insert / update の3本があるため、
-- クライアントから
--   supabase.from("usage_limits").update({ correction_count: 0 })
-- を直接叩けば自分のカウントを0に戻せてしまう。
--
-- shadowing_usage では select しか作らないので、この穴が無い
-- （audio_usage と同じ方針）。RLS 有効かつポリシー未定義の操作は
-- 拒否されるため、insert / update は本人であってもクライアントからは
-- 通らない。書き込み経路は try_use_shadowing() の1本だけになる。
--
-- この関数は SECURITY DEFINER で、所有者（テーブルの所有者でもある）
-- として実行されるため RLS の対象外。だから update ポリシーが無くても
-- 書ける。
--
-- ⚠️ 唯一の注意点: このテーブルに
--      ALTER TABLE public.shadowing_usage FORCE ROW LEVEL SECURITY;
--    を掛けると所有者にも RLS が適用され、RPC が書き込めなくなる
--    （消費が常に FALSE になる）。掛けないこと。VERIFY (4) で確認できる。
--
-- 既存テーブルの挙動は変えていない。usage_limits と audio_usage の
-- ポリシーはそのまま。
-- ============================================================
