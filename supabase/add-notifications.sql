-- ============================================================
--  In-app notification system
--  Run once in Supabase SQL Editor (idempotent).
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           text        NOT NULL,
  -- 'follow' | 'new_diary' | 'reaction' | 'comment'
  -- | 'obie_write' | 'obie_streak' | 'obie_welcome_back'
  actor_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  diary_entry_id uuid        REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  metadata       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_read        boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

-- 2. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Authenticated users can create their own notifications (Obie API uses auth session)
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. TRIGGER: Follow → notify the followed user
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- ============================================================
-- 4. TRIGGER: Diary becomes public → notify all followers
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_public_diary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if result is not public
  IF NOT NEW.is_public THEN
    RETURN NEW;
  END IF;
  -- On UPDATE skip if was already public (avoid re-notifying on unrelated edits)
  IF TG_OP = 'UPDATE' AND OLD.is_public = true THEN
    RETURN NEW;
  END IF;
  -- Skip if notifications were already sent for this diary (toggle private→public again)
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'new_diary' AND diary_entry_id = NEW.id
    LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  -- One notification per follower
  INSERT INTO public.notifications (user_id, type, actor_id, diary_entry_id)
  SELECT f.follower_id, 'new_diary', NEW.user_id, NEW.id
  FROM public.follows f
  WHERE f.following_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_public_diary ON public.diary_entries;
CREATE TRIGGER on_public_diary
  AFTER INSERT OR UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_public_diary();

-- ============================================================
-- 5. TRIGGER: Reaction added → notify diary owner
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diary_owner uuid;
  v_diary_id    uuid;
BEGIN
  SELECT af.user_id, af.diary_entry_id
    INTO v_diary_owner, v_diary_id
  FROM public.activity_feed af
  WHERE af.id = NEW.activity_id;

  -- No self-notification, skip if no linked diary
  IF v_diary_owner IS NULL OR v_diary_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Deduplicate: at most one reaction notification per (actor, diary) per hour
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id    = v_diary_owner
      AND type       = 'reaction'
      AND actor_id   = NEW.user_id
      AND diary_entry_id = v_diary_id
      AND created_at > now() - INTERVAL '1 hour'
    LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, actor_id, diary_entry_id)
  VALUES (v_diary_owner, 'reaction', NEW.user_id, v_diary_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_reaction ON public.reactions;
CREATE TRIGGER on_new_reaction
  AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reaction();

-- ============================================================
-- 6. TRIGGER: Comment added → notify diary owner
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diary_owner uuid;
BEGIN
  SELECT de.user_id INTO v_diary_owner
  FROM public.diary_entries de
  WHERE de.id = NEW.diary_entry_id;

  -- No self-notification
  IF v_diary_owner IS NULL OR v_diary_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, actor_id, diary_entry_id)
  VALUES (v_diary_owner, 'comment', NEW.user_id, NEW.diary_entry_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
