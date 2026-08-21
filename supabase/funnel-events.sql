-- ============================================================
--  funnel_events — 到達の記録
--  実行する場所: Supabase Dashboard → SQL Editor → New query
--  何度実行しても安全（IF NOT EXISTS / DROP POLICY IF EXISTS）
--
--  なぜ要るか:
--    サインイン済み1,011人のうち435人が日記を1本も書いていない。
--    「登録直後に消えた」「ダッシュボードで何も押さず消えた」
--    「書く画面まで来て諦めた」を区別する手段が、いまDBに無い。
--    既存34テーブルを全数調査したが、画面到達を残すものは1つも無く、
--    代用できるのは usage_limits（＝添削ボタンを押した）だけだった。
--
--  第1段階はこの1種類だけ:
--    write_opened  … /write に到達した
--  upgrade_opened は、プリフェッチ除外が実データで効いていることを
--  1週間見てから、check 制約を広げる形で追加する。
--
--  課金・plan 判定・correction_count / translation_count・streak の
--  どれにも触れない。既存テーブルへのカラム追加も無い。
-- ============================================================

create table if not exists public.funnel_events (
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('write_opened')),
  -- 書き手のタイムゾーンでの日付。middleware が user_tz クッキーと
  -- todayInTZ() から作る。UTC 固定にしないこと（CLAUDE.md の日付規則）。
  day        date not null,
  created_at timestamptz not null default now(),
  -- 1アカウント1種類1日1行。複合主キーが重複排除と索引を兼ねるので
  -- id 列は作らない。二重発火が起きても行は増えない。
  primary key (user_id, kind, day)
);

-- 「その日に何人が到達したか」を引くための索引。
-- 主キーは (user_id, ...) 始まりなので、日付から引くにはこちらが要る。
create index if not exists funnel_events_kind_day_idx
  on public.funnel_events (kind, day);

alter table public.funnel_events enable row level security;

-- 書き込みは本人の行だけ。
drop policy if exists "Insert own funnel event" on public.funnel_events;
create policy "Insert own funnel event"
  on public.funnel_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ⚠️ SELECT ポリシーは意図的に作らない。
--    「本人だけが読める」ではなく「API経由では誰も読めない」。
--    分析は Dashboard（service role）から行うので、クライアントに
--    読ませる理由が無い。開ける権限は少ないほうがよい。
--    UPDATE / DELETE も同じ理由で作らない。到達の記録は訂正しない。
--    退会時の削除は auth.users への on delete cascade が担当する。

-- PostgREST のスキーマキャッシュを更新
notify pgrst, 'reload schema';


-- ============================================================
--  分析用（読み取り専用。上の DDL とは別に、必要なときに実行する）
-- ============================================================

-- 6段のファネル。新しいイベントは write_opened の1つだけで、
-- 残りは既存テーブルから取れる。
--
--   1. 登録した                   auth.users
--   2. 一度でもサインインした      last_sign_in_at is not null
--   3. /write を開いた            funnel_events            ← 新規
--   4. 添削ボタンを押した          usage_limits
--   5. 日記を保存した              diary_entries
--
-- 「ダッシュボードを見て何も押さず消えた」は 2 に居て 3 に居ない人。
-- 専用のイベントは要らない。
--
-- select
--   count(*)                                                    as signed_in,
--   count(*) filter (where f.opened)                            as reached_write,
--   count(*) filter (where l.pressed)                           as pressed_correct,
--   count(*) filter (where d.wrote)                             as wrote,
--   count(*) filter (where f.opened and not d.wrote)            as opened_but_never_wrote,
--   count(*) filter (where not f.opened and not d.wrote)        as never_even_opened
-- from auth.users u
-- left join lateral (select true as opened  from public.funnel_events  where user_id = u.id and kind = 'write_opened' limit 1) f on true
-- left join lateral (select true as pressed from public.usage_limits   where user_id = u.id and correction_count > 0   limit 1) l on true
-- left join lateral (select true as wrote   from public.diary_entries  where user_id = u.id                            limit 1) d on true
-- where u.last_sign_in_at is not null;

-- ⚠️ 分母から外すもの: サインインしたことがない人（2026-08-21 時点で120人、
--    全体の10.6%）。セッションが存在しないので、どんな計装でも観測できない。
--    上のクエリの where 句がそれを担当している。

-- プリフェッチ除外が効いているかの確認（導入から数日後に必ず見ること）。
-- reached_write が signed_in にほぼ等しくなっていたら、除外が効いていない。
--
-- select day, count(*) as users
-- from public.funnel_events
-- where kind = 'write_opened'
-- group by day
-- order by day desc;
