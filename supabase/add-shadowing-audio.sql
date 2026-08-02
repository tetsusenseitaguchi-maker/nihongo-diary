-- ============================================================
--  Nihongo Diary — 音読（シャドーイング）録音の保存先
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜⑦ の順に1文ずつ実行する。
--
--  add-shadowing-limit.sql（回数カウンター）とは別ファイル。
--  あちらは「1日に何回まで」、こちらは「録音した音声をどこに置くか」。
--  実行順はどちらが先でも構わないが、両方流すまでアプリは動かない。
--
--  設計:
--    - diary_entries に nullable 列を1つ足すだけ（ADD のみ）。
--    - 新規バケット shadowing-audio を1つ作る（public = false）。
--    - storage.objects に本人スコープのポリシーを4本作る。
--    - 既存バケット（avatars / diary-images / diary-audio /
--      tts-shared / tts-diary）には触らない。
--    - diary_entries の既存列・既存トリガーには触らない。
--    - usage_limits / audio_usage / shadowing_usage / profiles / plan /
--      Stripe / streak には触らない。
--    - correction_count / translation_count / recheck_count と
--      try_use_* の各関数には触らない。
--
--  ⚠️ diary-audio を流用しない理由:
--     diary-audio は public = true（add-attachments.sql:56）で、URL を
--     知っていれば誰でも取得できる。日記への添付音声は本人が公開を
--     選ぶものだが、音読の録音は本人だけのもの。
--     さらにパスが両方とも <user_id>/<entry_id>.<ext> なので、同居させると
--     同じ日記で添付音声を上書きする。
-- ============================================================


-- ============================================================
--  ① diary_entries に保存先パスの列を足す
-- ============================================================
-- nullable。既存行は NULL のまま＝「まだ音読していない日記」。
-- 追加のみなので、既存の列・トリガー・RLS ポリシーは変わらない。
-- NOT NULL 制約もデフォルト値も付けないため、テーブルの書き換えは
-- 発生しない（メタデータだけの変更）。
--
-- 中身は <user_id>/<entry_id>.<ext> という完全なパス。
-- 拡張子が要るのは端末によって録れる形式が違うため:
--   webm … Chrome / Firefox / Android
--   m4a  … iOS / Safari（audio/mp4）
--   ogg  … 一部の環境
-- パスを DB に持たせておけば、どの形式で録ったかを保存先に問い合わせずに
-- 済み、日記一覧で「音読済み」バッジを出すのもこの列1つで足りる。
--
-- 1日記につき1本、再録音は同じパスへの上書き。履歴は持たない。
alter table public.diary_entries
  add column if not exists shadowing_audio_path text;


-- ============================================================
--  ② バケット作成 — shadowing-audio（非公開）
-- ============================================================
-- ⚠️ public = false が必須。true にすると URL を知っている誰でも
--    他人の音読を聞けてしまう。読み出しは署名 URL 経由にする。
--
-- file_size_limit は 10 MB。diary-audio のアプリ側の上限
-- （AUDIO_MAX_MB = 10, Attachments.tsx:17）と同じ値をバケット側にも
-- 置いている。このバケットはブラウザから直接アップロードされるため、
-- アプリのバリデーションを迂回されてもここで止まる。
--
-- allowed_mime_types は意図的に設定していない。録音の MIME は端末ごとに
-- 違い（上記③種類）、MediaRecorder が返す文字列には
-- ";codecs=opus" のようなパラメータが付くこともあるため、ここで
-- 絞ると iOS だけアップロードできない、という壊れ方をしやすい。
--
-- ⚠️ ON CONFLICT DO NOTHING なので、既にバケットがある状態で再実行しても
--    file_size_limit は更新されない。後から変えたい場合は ALTER ではなく
--    Dashboard から変更し、VERIFY (2) の期待値もこのファイルで更新すること。
insert into storage.buckets (id, name, public, file_size_limit)
  values ('shadowing-audio', 'shadowing-audio', false, 10485760)
  on conflict (id) do nothing;


-- ============================================================
--  ③ select ポリシー — 本人のフォルダだけ読める
-- ============================================================
-- ⚠️ ここが diary-audio との決定的な違い。
--    diary-audio の select は USING (bucket_id = 'diary-audio') だけで、
--    誰でも読める。こちらは (storage.foldername(name))[1] を auth.uid() と
--    突き合わせ、自分のフォルダに限定する。
--
-- 署名 URL の発行にも読み取り権限が要る。サーバー側で admin クライアント
-- （サービスロール）を使えば RLS を迂回できるが、そうしていないのは
-- 二重の防御のため: パスの組み立てにバグがあって他人の user_id が
-- 混ざっても、RLS が最後に止める。
drop policy if exists "Users read own shadowing audio" on storage.objects;
create policy "Users read own shadowing audio"
  on storage.objects for select
  using (
    bucket_id = 'shadowing-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
--  ④ insert ポリシー — 本人のフォルダにだけ書ける
-- ============================================================
-- ブラウザから supabase.storage.from("shadowing-audio").upload(...) で
-- 直接アップロードする（write/page.tsx:500 の diary-audio と同じ流儀）。
drop policy if exists "Users upload own shadowing audio" on storage.objects;
create policy "Users upload own shadowing audio"
  on storage.objects for insert
  with check (
    bucket_id = 'shadowing-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
--  ⑤ update ポリシー — 録り直しの上書きに要る
-- ============================================================
-- upsert: true でアップロードすると、2回目以降は UPDATE として扱われる。
-- このポリシーが無いと「1本目は保存できるが録り直しができない」という
-- 分かりにくい壊れ方をする。
drop policy if exists "Users update own shadowing audio" on storage.objects;
create policy "Users update own shadowing audio"
  on storage.objects for update
  using (
    bucket_id = 'shadowing-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
--  ⑥ delete ポリシー — 日記削除・退会時の後始末に要る
-- ============================================================
-- ⚠️ このポリシーだけでは後始末は完了しない。アプリ側に2箇所の対応が要る:
--
--    (1) src/app/api/account/delete/route.ts:15 の STORAGE_BUCKETS 配列に
--        'shadowing-audio' を追加する。入れないと退会後も音声が
--        residual data として残る。
--        （tts-shared だけは絶対に入れないこと — 全員で共有している
--          コンテンツアドレスのキャッシュなので、1人の退会が他の学習者の
--          音声を消してしまう。add-tts-buckets.sql の警告を参照。）
--
--    (2) src/app/api/diary/[id]/route.ts の削除処理。今は diary-audio と
--        diary-images しか消していないため（:164 付近）、日記を消しても
--        音読の録音が孤児として残る。
drop policy if exists "Users delete own shadowing audio" on storage.objects;
create policy "Users delete own shadowing audio"
  on storage.objects for delete
  using (
    bucket_id = 'shadowing-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
--  ⑦ PostgREST のスキーマキャッシュを再読み込み
-- ============================================================
-- ①で diary_entries に列を足しているので、これが要る。
-- 流すまで shadowing_audio_path は select / update できない。
-- （add-tts-buckets.sql では不要だった。あちらは storage.buckets に
--   行を足すだけで、スキーマが変わらなかったため。）
notify pgrst, 'reload schema';


-- ============================================================
--  VERIFY（①〜⑦ を流したあとに実行）
-- ============================================================
-- (1) 列が増えていて nullable であること
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='diary_entries'
--     AND column_name='shadowing_audio_path';
--   期待: shadowing_audio_path / text / YES / NULL
--
-- (2) バケットが非公開で、サイズ上限が入っていること
--   SELECT id, public, file_size_limit, allowed_mime_types
--   FROM storage.buckets WHERE id = 'shadowing-audio';
--   期待: shadowing-audio / false / 10485760 / NULL
--   ⚠️ public が true なら即座に false に戻すこと。
--      true だと URL を知るだけで他人の音読が聞ける。
--
-- (3) 既存バケットが無傷であること（触っていないので変化ゼロが期待値）
--   SELECT id, public FROM storage.buckets ORDER BY id;
--   期待: avatars/true, diary-audio/true, diary-images/true,
--         shadowing-audio/false, tts-diary/false, tts-shared/false
--
-- (4) このバケット向けのポリシーが4本、すべて揃っていること
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname='storage' AND tablename='objects'
--     AND policyname LIKE '%shadowing%'
--   ORDER BY cmd;
--   期待: 4行 → SELECT / INSERT / UPDATE / DELETE が1本ずつ
--   ⚠️ UPDATE が欠けていると録り直しだけが失敗する。
--
-- (5) select ポリシーが「本人のフォルダだけ」になっていること
--   SELECT policyname, qual FROM pg_policies
--   WHERE schemaname='storage' AND tablename='objects'
--     AND policyname = 'Users read own shadowing audio';
--   期待: qual に auth.uid() と storage.foldername の両方が現れる。
--   ⚠️ bucket_id の比較だけなら diary-audio と同じ全公開になっている。
--
-- (6) 既存の diary_entries が無傷であること
--   SELECT count(*) FROM public.diary_entries WHERE shadowing_audio_path IS NOT NULL;
--   期待: 0（まだ誰も音読していない）
--
--   SELECT tgname FROM pg_trigger
--   WHERE tgrelid = 'public.diary_entries'::regclass AND NOT tgisinternal
--   ORDER BY tgname;
--   期待: 実行前と同じ一覧。トリガーは追加も変更もしていない。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- ポリシーだけ落とす:
--   DROP POLICY IF EXISTS "Users read own shadowing audio"   ON storage.objects;
--   DROP POLICY IF EXISTS "Users upload own shadowing audio" ON storage.objects;
--   DROP POLICY IF EXISTS "Users update own shadowing audio" ON storage.objects;
--   DROP POLICY IF EXISTS "Users delete own shadowing audio" ON storage.objects;
--
-- バケットを消す（空でないと削除できないので中身が先）:
--   DELETE FROM storage.objects WHERE bucket_id = 'shadowing-audio';
--   DELETE FROM storage.buckets WHERE id = 'shadowing-audio';
--
-- 列を落とす（保存済みのパスも失われる）:
--   ALTER TABLE public.diary_entries DROP COLUMN IF EXISTS shadowing_audio_path;
--   NOTIFY pgrst, 'reload schema';
--
-- ⚠️ 列を落とすとどの日記に録音があったか分からなくなる。バケットを
--    残したまま列だけ落とすと、音声はストレージに残るが到達できない
--    ゴミになる。両方消すか、両方残すこと。
--
-- ⚠️ ロールバックしても usage_limits / audio_usage / shadowing_usage、
--    既存の5関数、既存の5バケットには影響しない
--    （このファイルは一度も触っていないため）。


-- ============================================================
--  NOTE — なぜ tts の2バケットと方針が違うのか
-- ============================================================
-- add-tts-buckets.sql は storage.objects のポリシーを1本も作らず、
-- 「ポリシーを作らないこと自体が防御」だと書いてある。読み書きするのが
-- /api/tts のサービスロールだけで、クライアントから直接触れないように
-- 塞ぐことで、生涯上限のカウントを迂回する経路を無くしている。
--
-- こちらは事情が違う。音読の録音はブラウザで生成した blob を
-- クライアントから直接アップロードするので（サーバーを経由させると
-- 数MBの音声を Vercel の関数に通すことになる）、本人のセッションで
-- 書き込めなければならない。だから diary-images / diary-audio と同じく
-- 本人スコープのポリシーを置く。
--
-- ただし select だけは diary-audio と違い本人限定にしている。
-- 「クライアントから直接アップロードする」ことと
-- 「誰でも読める」ことは別の話で、後者を選ぶ理由が無い。
-- ============================================================
