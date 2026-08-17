-- ============================================================
--  weekly_goals — 「今週は何日書くか」を学習者本人が決める
-- ============================================================
--
-- Supabase Dashboard の SQL Editor で ① から ⑤ を順に、1つずつ実行する。
-- 全部べき等なので、途中で止まっても同じものを流し直して構わない。
--
--
-- ── なぜ profiles の列ではなく別テーブルなのか ──────────────────
--
-- profiles に列を足すのは、このアプリで最も高くついた事故の形そのもの。
-- 列が1つ欠けるだけで select 全体がエラーになり、profile が null になり、
-- normalizePlan(undefined) が "free" を返して全員が Free 扱いになる
-- （api/correct/route.ts と dashboard/page.tsx の両方に警告コメントがある）。
-- 週目標は課金にも添削にも一切関係しないのに、同じ爆発半径に入れる理由がない。
--
-- 形は vocab_review_settings と discovery_settings をそのまま踏襲している。
-- 迷ったらそちらを読むこと。
--
--
-- ── 「未設定」の表し方 ────────────────────────────────────────
--
-- ⚠️ 行が無い = まだ一度も決めていない。NULL では表さない。
--
-- vocab_review_settings は daily_target NULL を「無制限」に使っているが、
-- ここで NULL を使うと「未設定」と「目標なしを選んだ」が区別できなくなる。
-- 週目標は「選ぶ行為そのものがコミットメント」なので、選んでいない状態を
-- 曖昧にしてはいけない。行が無ければ選択導線を出す、あれば進捗を出す。
--
-- だから target_days は NOT NULL で、代わりに ④ で delete を許している
-- （vocab_review_settings は delete を許していない）。「目標をやめる」は
-- 行を消して未設定に戻すことで表す。
--
--
-- ── target_days の値について ──────────────────────────────────
--
-- アプリが出す選択肢は 3 / 5 / 7（毎日）。CHECK が 1〜7 と広いのは意図的で、
-- vocab_review_settings と同じ考え方 — CHECK は明らかなゴミ（0・負数・8以上）
-- だけを弾く保険で、実際のメニューはアプリが決める。
--
-- これは将来の逃げ道でもある。実測（アクティブな週883件）では週の執筆日数は
-- 1日が57.4%、2日が14.3%で、3日以上に届くのは28.3%しかない。3が最低段だと
-- 7割の週で未達バーが出る。「週2日」を足す判断になったとき、この CHECK なら
-- SQL を流し直さずにアプリ側だけで足せる。
--
--
-- ── タイムゾーンはこのテーブルに入らない ──────────────────────
--
-- 週の起点をどう決めるかは表示側の計算の話で、スキーマには現れない。
-- 保存するのは「何日を目標にしたか」だけ。起点を後から変えても、
-- このテーブルは一切マイグレーション不要。


-- ============================================================
--  ① テーブル作成
-- ============================================================
create table if not exists public.weekly_goals (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  target_days integer     not null check (target_days >= 1 and target_days <= 7),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ============================================================
--  ② RLS 有効化
-- ============================================================
-- これを忘れると anon キーで他人の行が読める。①だけ流して止まらないこと。
alter table public.weekly_goals enable row level security;


-- ============================================================
--  ③ ポリシー削除（③④はセットで実行する）
-- ============================================================
-- 先に消してから作る。permissive なポリシーは OR で足し合わされるので、
-- 名前違いのものを二重に作ると権限が広がりうる。
drop policy if exists "Read own weekly goal"   on public.weekly_goals;
drop policy if exists "Insert own weekly goal" on public.weekly_goals;
drop policy if exists "Update own weekly goal" on public.weekly_goals;
drop policy if exists "Delete own weekly goal" on public.weekly_goals;


-- ============================================================
--  ④ ポリシー作成
-- ============================================================
-- 本人だけが読み書きできる。他人の目標は誰にも見えない — これは進捗の
-- 共有機能ではないので、フィードやプロフィールから読む経路を作らない。
create policy "Read own weekly goal"
  on public.weekly_goals for select using (auth.uid() = user_id);

create policy "Insert own weekly goal"
  on public.weekly_goals for insert with check (auth.uid() = user_id);

create policy "Update own weekly goal"
  on public.weekly_goals for update
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ⚠️ delete を許すのは vocab_review_settings との意図的な違い。
-- 上の「未設定の表し方」を参照 — 行の不在が未設定なので、やめる操作は
-- 行の削除でしか表せない。書き換えられて困る値ではない（本人の目標であって、
-- 上限でもクォータでも課金でもない）。
create policy "Delete own weekly goal"
  on public.weekly_goals for delete using (auth.uid() = user_id);


-- ============================================================
--  ⑤ PostgREST にスキーマを読み直させる
-- ============================================================
-- これを流すまで、このテーブルは select も insert もできない。
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑤ を流したあとに実行・読み取りのみ）
-- ============================================================
-- (1) テーブルができていること
--   SELECT column_name, data_type, is_nullable
--   FROM   information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'weekly_goals'
--   ORDER  BY ordinal_position;
--   期待: user_id/uuid/NO, target_days/integer/NO,
--         created_at/timestamptz/NO, updated_at/timestamptz/NO
--
-- (2) RLS が有効であること
--   SELECT relrowsecurity FROM pg_class
--   WHERE  oid = 'public.weekly_goals'::regclass;
--   期待: true
--
-- (3) ポリシーが4本あること
--   SELECT policyname, cmd FROM pg_policies
--   WHERE  schemaname = 'public' AND tablename = 'weekly_goals'
--   ORDER  BY policyname;
--   期待: Delete own weekly goal / DELETE
--         Insert own weekly goal / INSERT
--         Read own weekly goal   / SELECT
--         Update own weekly goal / UPDATE
--
-- (4) CHECK が効いていること（エラーになれば正解）
--   INSERT INTO public.weekly_goals (user_id, target_days)
--   VALUES ('00000000-0000-0000-0000-000000000000', 0);
--   期待: new row ... violates check constraint "weekly_goals_target_days_check"
--
-- (5) ★重要★ plan 関連の列が無傷であること
--   SELECT column_name FROM information_schema.columns
--   WHERE  table_schema = 'public' AND table_name = 'profiles'
--     AND  column_name IN ('plan','timezone','preferred_language');
--   期待: 3行。ここが減っていたら api/correct の profiles select が丸ごと
--         エラーになり、全員 Free 扱いになる。このスクリプトは profiles を
--         一切触らないので減るはずがないが、確認は安い。
