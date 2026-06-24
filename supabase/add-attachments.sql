-- ============================================================
--  Add photo + audio attachment support to diary_entries
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. New nullable columns (safe to run on an existing table)
ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS audio_path text;


-- ============================================================
--  Storage bucket: diary-images  (jpg / png / webp, max 5 MB)
--  Objects are stored at:  <user_id>/<entry_id>.<ext>
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('diary-images', 'diary-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Diary images are publicly readable" ON storage.objects;
CREATE POLICY "Diary images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'diary-images');

-- Users may only write to their own folder  (<user_id>/...)
DROP POLICY IF EXISTS "Users can upload their own diary images" ON storage.objects;
CREATE POLICY "Users can upload their own diary images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'diary-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own diary images" ON storage.objects;
CREATE POLICY "Users can update their own diary images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'diary-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own diary images" ON storage.objects;
CREATE POLICY "Users can delete their own diary images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'diary-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
--  Storage bucket: diary-audio  (mp3 / m4a / wav / webm, max 10 MB)
--  Objects are stored at:  <user_id>/<entry_id>.<ext>
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('diary-audio', 'diary-audio', true)
  ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Diary audio is publicly readable" ON storage.objects;
CREATE POLICY "Diary audio is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'diary-audio');

DROP POLICY IF EXISTS "Users can upload their own diary audio" ON storage.objects;
CREATE POLICY "Users can upload their own diary audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'diary-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own diary audio" ON storage.objects;
CREATE POLICY "Users can update their own diary audio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'diary-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own diary audio" ON storage.objects;
CREATE POLICY "Users can delete their own diary audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'diary-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- Reload PostgREST schema cache so new columns are immediately visible
NOTIFY pgrst, 'reload schema';
