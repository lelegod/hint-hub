CREATE TABLE public.hint_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.tutor_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  hint_index INTEGER NOT NULL,
  challenge JSONB NOT NULL,
  selected_index INTEGER,
  reasoning TEXT NOT NULL DEFAULT '',
  submitted BOOLEAN NOT NULL DEFAULT false,
  was_correct BOOLEAN,
  reasoning_eval JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_id, hint_index)
);

CREATE INDEX idx_hint_entries_session ON public.hint_entries(session_id, hint_index);

ALTER TABLE public.hint_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hint entries"
  ON public.hint_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hint entries"
  ON public.hint_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hint entries"
  ON public.hint_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hint entries"
  ON public.hint_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_hint_entries_updated_at
  BEFORE UPDATE ON public.hint_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();