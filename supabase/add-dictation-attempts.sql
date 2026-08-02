-- ============================================================
--  Nihongo Diary — ディクテーションの点数を記録する
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑧ の順に1文ずつ実行する。
--
--  なぜ必要か:
--    同じ文を2日連続で書き取り、「2回目のほうが上がった」を見せるため。
--    1回目の点数が残っていないと成立しない。現状はどこにも送っていない
--    （DictationExercise.tsx:24-25 が明言している通り）。
--
--  設計:
--    - 新規テーブル1つ + 新規関数1つ。既存には何も足さない。
--    - 1日記・1日につき1行（主キーがそれを保証する）。「1回目 / 2回目」は
--      行の数ではなく usage_date の順序で決まる。
--    - 回数制限のためのテーブルではない。ディクテーションは数えない
--      （原価は音声の再生で、キャッシュヒットは無料。音声側の1日1回で
--        自然に律速される）。
--    - usage_limits / audio_usage / audio_usage_daily / shadowing_usage /
--      correction_count / translation_count / recheck_count には触らない。
--    - try_use_* の各関数、normalizePlan、profiles / plan / Stripe / streak、
--      既存トリガーには触らない。
--    - diary_entries には列を足さない（この機能のためには不要）。
-- ============================================================


-- ============================================================
--  ① テーブル作成
-- ============================================================
-- 主キーは (user_id, diary_entry_id, usage_date) の複合。
-- 「この学習者が、この日記を、この日に書き取った結果」が1行。
-- ⑥の ON CONFLICT はこれを arbiter として使う。
--
-- diary_entry_id は on delete cascade。日記を消せば点数も消える。
-- 音読の録音と違ってストレージを使わないので、後始末はこれで完結する
-- （/api/diary/[id] にも /api/account/delete にも追記は要らない）。
--
-- sentence_kana を持つ理由:
--   採点の答えは pickSentence(natural_japanese) の1文で、これは
--   natural_japanese が変われば変わる（再添削など）。別の文の点数を
--   並べて「上達した」と言うのは嘘になるので、2回とも同じ文だったときだけ
--   比較を出せるようにキーを残す。ハッシュではなくかなそのものを入れて
--   あるのは、SQL Editor から目で確認できるほうが調査が早いため
--   （lib/dictation.ts の MAX_KANA が60なので長くならない）。
--
-- percent の CHECK は、採点をサーバー側でやり直す設計（後述の NOTE）が
-- 崩れたときに気づくための最後の網。
create table if not exists public.dictation_attempts (
  user_id        uuid not null references auth.users (id) on delete cascade,
  diary_entry_id uuid not null references public.diary_entries (id) on delete cascade,
  usage_date     date not null,
  percent        integer not null check (percent between 0 and 100),
  correct_count  integer not null,
  total_count    integer not null,
  distance       integer not null,
  sentence_kana  text    not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, diary_entry_id, usage_date)
);


-- ============================================================
--  ② 日付で引くためのインデックス
-- ============================================================
-- 主キーの2番目が diary_entry_id なので、
--   where user_id = ? and usage_date = ?
-- は主キーインデックスでは効率よく引けない（user_id の全行を舐める）。
-- この形で引く場面が2つある:
--   ・ダッシュボードの「昨日の文をもう一度」カード
--   ・翌朝のプッシュの対象者判定（今日まだ書き取っていない人）
-- どちらも毎日走るので、素直にインデックスを足しておく。
create index if not exists dictation_attempts_user_date_idx
  on public.dictation_attempts (user_id, usage_date);


-- ============================================================
--  ③ RLS を有効化
-- ============================================================
alter table public.dictation_attempts enable row level security;


-- ============================================================
--  ④ select ポリシーを作り直す前に落とす（べき等化）
-- ============================================================
drop policy if exists "Users read own dictation attempts" on public.dictation_attempts;


-- ============================================================
--  ⑤ select ポリシー — 本人の行だけ読める
-- ============================================================
-- ダッシュボードと /dictation/[id] がこれで読む。
--
-- ⚠️ insert / update ポリシーは意図的に作らない。作ると、クライアントから
--    直接 percent: 100 の行を入れられる。点数はサーバー側で採点し直した
--    結果だけを入れたいので、書き込み経路は⑥の関数1本に限定する。
create policy "Users read own dictation attempts"
  on public.dictation_attempts for select using (auth.uid() = user_id);


-- ============================================================
--  ⑥ 記録関数 — その日の最高点を残す
-- ============================================================
-- 1日に何度やり直しても、残るのはその日の最高点。
--
-- なぜ「最初の1回」でも「最後の1回」でもないのか:
--   最初の1回だと、やり直して伸びた結果が記録されない。
--   最後の1回だと、気まぐれな打ち直しで下がる。
--   最高点どうしの比較なら1日目も2日目も同じ条件で、
--   「間違えたらやり直す」ことが不利にならない。やり直して正解に
--   たどり着くこと自体が練習なので、そこに罰を与えたくない。
--
-- ⚠️ 上書きの条件は「点数が上がったときだけ」。ON CONFLICT の WHERE で
--    表現しているので、判定と更新が1文で原子的に済む。
--    supabase-js の .upsert() では WHERE 付きの ON CONFLICT を書けないため、
--    関数にしている。
--
-- ⚠️ p_date は呼び出し側が学習者のタイムゾーンで計算して渡す。
--    ここで current_date を使うと UTC 基準になる。
create or replace function public.record_dictation_attempt(
  p_user_id        uuid,
  p_diary_entry_id uuid,
  p_date           date,
  p_percent        integer,
  p_correct        integer,
  p_total          integer,
  p_distance       integer,
  p_sentence_kana  text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dictation_attempts (
    user_id, diary_entry_id, usage_date,
    percent, correct_count, total_count, distance, sentence_kana,
    created_at, updated_at
  )
  values (
    p_user_id, p_diary_entry_id, p_date,
    p_percent, p_correct, p_total, p_distance, p_sentence_kana,
    now(), now()
  )
  on conflict (user_id, diary_entry_id, usage_date) do update
    set percent       = excluded.percent,
        correct_count = excluded.correct_count,
        total_count   = excluded.total_count,
        distance      = excluded.distance,
        sentence_kana = excluded.sentence_kana,
        updated_at    = now()
  where excluded.percent > public.dictation_attempts.percent;
end;
$$;


-- ============================================================
--  ⑦ 実行権限 — サービスロールだけ
-- ============================================================
-- ⚠️ ここがこの機能のセキュリティ上の境界。
--
-- Postgres は関数の EXECUTE を既定で PUBLIC に与えるため、明示的に
-- 剥がさないと authenticated から呼べてしまう。呼べると、点数を
-- サーバー側で採点し直す意味が無くなる（好きな percent を渡せる）。
--
-- 既存の try_use_* が authenticated に grant しているのは、あちらが
-- auth.uid() = p_user_id の所有者チェックを持ち、渡せる値が「自分の分を
-- 1つ消費する」しかないから。こちらは点数という任意の値を受け取るので、
-- 同じ形にはできない。
--
-- この関数を呼ぶのは /api/dictation/attempt だけで、そこでは管理者
-- クライアント（サービスロール）を使う。ルートは打たれた文字列を受け取り、
-- natural_japanese を読んで pickSentence + markAnswer を実行し、
-- その結果だけをここに渡す。
revoke all on function public.record_dictation_attempt(uuid, uuid, date, integer, integer, integer, integer, text) from public;
grant execute on function public.record_dictation_attempt(uuid, uuid, date, integer, integer, integer, integer, text) to service_role;


-- ============================================================
--  ⑧ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑧ を流したあとに実行）
-- ============================================================
-- (1) テーブルの構造
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='dictation_attempts'
--   ORDER BY ordinal_position;
--   期待: user_id / diary_entry_id / usage_date / percent / correct_count
--         / total_count / distance / sentence_kana / created_at / updated_at
--
-- (2) 主キーが3列であること（⑥の ON CONFLICT の前提）
--   SELECT conname, contype, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid='public.dictation_attempts'::regclass
--   ORDER BY contype;
--   期待: PRIMARY KEY (user_id, diary_entry_id, usage_date)
--         auth.users への FK、diary_entries への FK、percent の CHECK
--
-- (3) インデックス
--   SELECT indexname FROM pg_indexes
--   WHERE schemaname='public' AND tablename='dictation_attempts';
--   期待: 主キーの索引 + dictation_attempts_user_date_idx
--
-- (4) RLS が有効で、ポリシーは select の1本だけ
--   SELECT relrowsecurity FROM pg_class
--   WHERE oid='public.dictation_attempts'::regclass;               -- 期待: true
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='public' AND tablename='dictation_attempts';
--   期待: 1行のみ → "Users read own dictation attempts" / SELECT
--   ⚠️ 2行以上なら insert か update が混入している。混入したまま出すと
--      クライアントから満点を書き込める。
--
-- (5) FORCE RLS が掛かっていないこと
--   SELECT relforcerowsecurity FROM pg_class
--   WHERE oid='public.dictation_attempts'::regclass;               -- 期待: false
--
-- (6) ★重要★ 関数を authenticated が呼べないこと
--   SELECT p.proname, p.prosecdef,
--          has_function_privilege('authenticated',  p.oid, 'EXECUTE') AS authenticated_can,
--          has_function_privilege('service_role',   p.oid, 'EXECUTE') AS service_can
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--   WHERE n.nspname='public' AND p.proname='record_dictation_attempt';
--   期待: prosecdef = true, authenticated_can = FALSE, service_can = true
--   ⚠️ authenticated_can が true なら⑦が効いていない。この状態で出すと
--      点数を自由に書き込めるので、先に⑦を流し直すこと。
--
-- (7) 既存が無傷であること（触っていないので変化ゼロが期待値）
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='usage_limits'
--   ORDER BY ordinal_position;
--   期待: id, user_id, usage_date, correction_count, native_count,
--         created_at, updated_at, translation_count, recheck_count
--
--   SELECT tgname FROM pg_trigger
--   WHERE tgrelid='public.diary_entries'::regclass AND NOT tgisinternal
--   ORDER BY tgname;
--   期待: 実行前と同じ一覧。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- 関数だけ落とす（点数は残る。保存が止まるだけ）:
--   DROP FUNCTION IF EXISTS public.record_dictation_attempt(uuid, uuid, date, integer, integer, integer, integer, text);
--   NOTIFY pgrst, 'reload schema';
--
-- 完全に元に戻す（記録した点数も破棄される）:
--   DROP TABLE IF EXISTS public.dictation_attempts;   -- ポリシーと索引も一緒に消える
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ 点数を捨てると「1回目 vs 2回目」の比較が過去に遡って出せなくなる。
--    ディクテーションそのものは動き続ける（採点はクライアント側の
--    純関数で、保存とは独立しているため）。


-- ============================================================
--  NOTE — 採点をどこで行うか
-- ============================================================
-- 画面に出す点数は今まで通りクライアントで即座に計算する
-- （markAnswer は純関数で、同じ入力は常に同じ点数になる）。
-- 保存する点数はサーバーで採点し直したものを使う。
--
-- 両者は必ず一致する。同じ純関数に同じ入力を与えるため
-- （lib/dictation.ts:4-6 が「サーバールートからも呼べる」と明記している）。
-- 画面は待たされず、記録は改竄できない、という分担になる。
--
-- ⚠️ ルートは percent をクライアントから受け取ってはいけない。
--    受け取るのは「打たれた文字列」と「日記の id」だけ。文と答えは
--    サーバーが DB から読む。ここを崩すと⑦の grant が無意味になる。
-- ============================================================
