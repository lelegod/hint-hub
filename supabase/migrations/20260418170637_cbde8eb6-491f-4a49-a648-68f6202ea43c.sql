-- Enable realtime for tutor_sessions and activity_events
DO $$
BEGIN
  -- tutor_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tutor_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tutor_sessions;
  END IF;

  -- activity_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
  END IF;
END $$;

-- Ensure full row data is sent on updates so we can react to status changes
ALTER TABLE public.tutor_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.activity_events REPLICA IDENTITY FULL;