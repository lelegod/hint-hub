-- ============ AUTH PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============ GAMIFICATION STATE ============
CREATE TABLE public.gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  -- streak
  streak_days INTEGER NOT NULL DEFAULT 0,
  streak_freezes INTEGER NOT NULL DEFAULT 1,
  last_active_date DATE,
  -- hint tokens (hybrid: time regen + earned)
  hint_tokens INTEGER NOT NULL DEFAULT 5,
  max_hint_tokens INTEGER NOT NULL DEFAULT 5,
  last_token_regen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- brain heat meter (resets on session end / inactivity)
  brain_heat INTEGER NOT NULL DEFAULT 0,
  brain_heat_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- counters
  total_hints_solved INTEGER NOT NULL DEFAULT 0,
  total_sessions_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gamification viewable by owner"
  ON public.gamification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
  ON public.gamification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON public.gamification FOR UPDATE
  USING (auth.uid() = user_id);

-- ============ SKILL TREE NODES ============
CREATE TABLE public.skill_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  parent_topic TEXT,
  mastery INTEGER NOT NULL DEFAULT 0,    -- 0..100
  times_practiced INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);

ALTER TABLE public.skill_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skill nodes viewable by owner"
  ON public.skill_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill nodes"
  ON public.skill_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill nodes"
  ON public.skill_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_skill_nodes_user ON public.skill_nodes(user_id);

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gamification_updated_at
  BEFORE UPDATE ON public.gamification
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_nodes_updated_at
  BEFORE UPDATE ON public.skill_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO-CREATE PROFILE + GAMIFICATION ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.gamification (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();