-- =========================================
-- TUTOR SESSIONS
-- =========================================
CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'abandoned');

CREATE TABLE public.tutor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled session',
  problem_summary TEXT NOT NULL DEFAULT '',
  full_problem_text TEXT,
  source_summary TEXT,
  extra_summary TEXT,
  total_hints_planned INTEGER NOT NULL DEFAULT 3,
  hints_used INTEGER NOT NULL DEFAULT 0,
  status public.session_status NOT NULL DEFAULT 'active',
  final_answer TEXT,
  final_correct BOOLEAN,
  final_feedback TEXT,
  problem_file_url TEXT,
  problem_file_name TEXT,
  source_file_url TEXT,
  source_file_name TEXT,
  extra_file_url TEXT,
  extra_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tutor_sessions_user_created ON public.tutor_sessions(user_id, created_at DESC);

ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.tutor_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.tutor_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.tutor_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.tutor_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_tutor_sessions_updated_at
  BEFORE UPDATE ON public.tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- FRIENDSHIPS
-- =========================================
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'blocked');

CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT friendship_distinct CHECK (requester_id <> addressee_id),
  CONSTRAINT friendship_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can request friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can update friendship status"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Either side can remove friendship"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: are two users friends? (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.are_friends(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a)
      )
  );
$$;

-- =========================================
-- ACTIVITY EVENTS
-- =========================================
CREATE TYPE public.activity_type AS ENUM (
  'session_started',
  'session_completed',
  'hint_solved',
  'streak_milestone'
);

CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.activity_type NOT NULL,
  message TEXT NOT NULL,
  session_id UUID REFERENCES public.tutor_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_user_created ON public.activity_events(user_id, created_at DESC);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and friends activity"
  ON public.activity_events FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.are_friends(auth.uid(), user_id)
  );

CREATE POLICY "Users can insert own activity"
  ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity"
  ON public.activity_events FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-log a friend-visible activity event when a session completes
CREATE OR REPLACE FUNCTION public.log_session_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.activity_events (user_id, type, message, session_id)
    VALUES (
      NEW.user_id,
      'session_completed',
      'completed "' || COALESCE(NULLIF(NEW.title, ''), 'a session') || '" in ' || NEW.hints_used || ' hints',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_session_completion
  AFTER UPDATE ON public.tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_session_completion();