-- ============================================================
--  Nihongo Diary — 音声（TTS）キャッシュ用ストレージバケット
--  Run in: Supabase Dashboard -> SQL Editor -> New query
--  Safe to run multiple times (idempotent).
--  ①〜② の順に1文ずつ実行する。
--
--  ⚠️ 本番プロジェクトでは、この2つは既に手動で作成済み（2026-08-01 時点で
--     存在を確認）。このファイルは「今そこにある状態」を記録し、新しい環境で
--     再現できるようにするためのもの。本番で流しても
--     ON CONFLICT DO NOTHING により何も起きない。
--
--  設計:
--    - storage.buckets に2行 INSERT するだけ。
--    - 既存バケット（avatars / diary-images / diary-audio）には触らない。
--    - storage.objects のポリシーは1本も作らない（理由は末尾の NOTE）。
--    - audio_usage / try_use_audio / refund_audio には触らない
--      （それらは add-audio-limit.sql の担当）。
--    - profiles / plan / Stripe / streak / 既存トリガーには触らない。
--
--  バケットを2つに分ける理由（/api/tts の実装と対応）:
--    tts-shared … 単語・表現の音声。パスは <sha256>.mp3 で user_id を含まない。
--                 内容だけで決まるので、全学習者が同じ「公園」の音声を共有する。
--    tts-diary  … 学習者本人の日記の音声。個人データなので
--                 <user_id>/<sha256>.mp3 に保存する。
-- ============================================================


-- ============================================================
--  ① tts-shared — 単語・表現の共有キャッシュ（非公開）
-- ============================================================
-- public = false が必須。true にすると URL を知っている誰でも取得できる。
-- 読み書きは /api/tts のサービスロール（admin クライアント）のみが行う。
--
-- ⚠️ このバケットは /api/account/delete の STORAGE_BUCKETS に
--    絶対に追加しないこと。パスに user_id が入っておらず全員で共有している
--    ため、1人の退会が他の学習者のキャッシュを消してしまう。
--    （src/app/api/account/delete/route.ts:15 — 現在の配列に tts-shared は
--      含まれていない。それが正しい状態。）
insert into storage.buckets (id, name, public)
  values ('tts-shared', 'tts-shared', false)
  on conflict (id) do nothing;


-- ============================================================
--  ② tts-diary — 本人の日記音声（非公開・個人データ）
-- ============================================================
-- パスは <user_id>/<sha256>.mp3。
--
-- ⚠️ このバケットは /api/account/delete の STORAGE_BUCKETS に
--    含まれていなければならない。含まれていないと、退会後も日記の音声が
--    ストレージに residual data として残る。
--    （現在の配列: avatars, diary-images, diary-audio, tts-diary — 含まれている。）
insert into storage.buckets (id, name, public)
  values ('tts-diary', 'tts-diary', false)
  on conflict (id) do nothing;


-- ============================================================
--  VERIFY（①〜② を流したあとに実行）
-- ============================================================
-- (1) 2つのバケットが存在し、どちらも非公開であること
--   SELECT id, name, public FROM storage.buckets
--   WHERE id IN ('tts-shared', 'tts-diary') ORDER BY id;
--   期待: tts-diary / false, tts-shared / false
--   ⚠️ public が true の行があれば即座に false に戻すこと。
--      tts-diary が public だと、他人の日記音声を URL だけで取得できる。
--
-- (2) 既存バケットが無傷であること（触っていないので変化ゼロが期待値）
--   SELECT id, public FROM storage.buckets ORDER BY id;
--   期待: avatars/true, diary-audio/true, diary-images/true,
--         tts-diary/false, tts-shared/false
--
-- (3) この2バケット向けの storage.objects ポリシーが存在しないこと
--   SELECT policyname, cmd FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--     AND (qual::text LIKE '%tts-%' OR with_check::text LIKE '%tts-%');
--   期待: 0行（NOTE 参照）
--
-- NOTE: notify pgrst, 'reload schema' は不要。
--       行を追加しているだけでスキーマは変わらず、Storage API は
--       PostgREST のスキーマキャッシュを経由しないため。


-- ============================================================
--  ROLLBACK（必要なときだけ）
-- ============================================================
-- バケットは空でないと削除できない。先に中身を消す:
--   DELETE FROM storage.objects WHERE bucket_id = 'tts-shared';
--   DELETE FROM storage.buckets WHERE id = 'tts-shared';
--
--   DELETE FROM storage.objects WHERE bucket_id = 'tts-diary';
--   DELETE FROM storage.buckets WHERE id = 'tts-diary';
--
-- ⚠️ tts-shared を消すと共有キャッシュが全て失われる。音声自体は
--    作り直せるが、作り直しは Google TTS の実費が掛かる（キャッシュヒットは
--    無料、ミスは課金）。しかも生涯上限のカウンターは戻らないので、
--    学習者は「前に聞けた単語がもう聞けない」状態になりうる。
--
-- ⚠️ tts-diary を消すと学習者本人の日記音声が消える。こちらも
--    上限カウンターは戻らない。
--
-- ⚠️ ロールバックしても audio_usage / try_use_audio / refund_audio および
--    usage_limits と既存3関数には影響しない（このファイルは触っていない）。


-- ============================================================
--  NOTE — storage.objects のポリシーを1本も作らない理由
-- ============================================================
-- diary-images / diary-audio（add-attachments.sql）は、ブラウザから
-- 直接アップロードし <img> / <audio> で直接読むため、
-- 「本人のフォルダにだけ書ける」ポリシーが必要だった。
--
-- TTS の2バケットはそうではない。読み書きするのは /api/tts だけで、
-- そこではサービスロールの admin クライアントを使う。サービスロールは
-- RLS を通らないので、ポリシーが無くても動く。
--
-- 逆に言うと、ポリシーを作らないことが防御になっている:
-- RLS 有効かつポリシー未定義の操作は拒否されるため、クライアントから
--   supabase.storage.from("tts-diary").list(...)
-- を直接叩いても何も取れない。音声への唯一の入口が /api/tts になり、
-- 生涯上限のカウントを迂回して音声を取得する経路が塞がれる。
--
-- ⚠️ したがって、この2バケットに「本人なら読める」select ポリシーを
--    後から足さないこと。足すと、上限に達した学習者でも
--    キャッシュ済みの音声をクライアントから直接取得できてしまう。
--
-- ⚠️ file_size_limit / allowed_mime_types は意図的に設定していない
--    （現状のバケットも未設定）。書き込むのは /api/tts だけで、
--    Google TTS が返す MP3 以外がここに入る経路が無いため。
--    設定したくなった場合は ALTER ではなく Dashboard から変更し、
--    このファイルの VERIFY (1) も更新すること。
-- ============================================================
