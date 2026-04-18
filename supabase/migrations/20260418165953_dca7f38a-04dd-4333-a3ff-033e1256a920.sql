-- Add status fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS status_emoji text,
  ADD COLUMN IF NOT EXISTS status_message text,
  ADD COLUMN IF NOT EXISTS current_activity text;

-- Allow friends to view each other's profiles (needed to display status)
DROP POLICY IF EXISTS "Friends can view each other profiles" ON public.profiles;
CREATE POLICY "Friends can view each other profiles"
ON public.profiles
FOR SELECT
USING (public.are_friends(auth.uid(), user_id));

-- Heartbeat RPC: updates last_seen for the current user
CREATE OR REPLACE FUNCTION public.heartbeat()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
    SET last_seen_at = now()
    WHERE user_id = auth.uid();
$$;

-- Update custom status for current user
CREATE OR REPLACE FUNCTION public.update_my_status(_emoji text, _message text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
    SET status_emoji = NULLIF(TRIM(_emoji), ''),
        status_message = NULLIF(TRIM(_message), ''),
        updated_at = now()
    WHERE user_id = auth.uid();
$$;

-- Set current activity (called when a session starts/ends)
CREATE OR REPLACE FUNCTION public.set_my_activity(_activity text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
    SET current_activity = NULLIF(TRIM(_activity), ''),
        updated_at = now()
    WHERE user_id = auth.uid();
$$;

-- Replace list_friends to include status fields and presence
DROP FUNCTION IF EXISTS public.list_friends();
CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE (
  friend_user_id uuid,
  friend_name text,
  since timestamp with time zone,
  last_seen_at timestamp with time zone,
  status_emoji text,
  status_message text,
  current_activity text,
  presence text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS friend_user_id,
    COALESCE(p.display_name, 'Friend') AS friend_name,
    f.updated_at AS since,
    p.last_seen_at,
    p.status_emoji,
    p.status_message,
    p.current_activity,
    CASE
      WHEN p.last_seen_at IS NULL THEN 'offline'
      WHEN p.last_seen_at > now() - interval '1 minute' THEN 'online'
      WHEN p.last_seen_at > now() - interval '5 minutes' THEN 'away'
      ELSE 'offline'
    END AS presence
  FROM public.friendships f
  LEFT JOIN public.profiles p
    ON p.user_id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ORDER BY
    CASE
      WHEN p.last_seen_at > now() - interval '1 minute' THEN 0
      WHEN p.last_seen_at > now() - interval '5 minutes' THEN 1
      ELSE 2
    END,
    f.updated_at DESC;
$$;