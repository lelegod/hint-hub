DROP FUNCTION IF EXISTS public.list_friends();

CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE(
  friend_user_id uuid,
  friend_name text,
  since timestamptz,
  last_seen_at timestamptz,
  status_emoji text,
  status_message text,
  current_activity text,
  presence text,
  level int,
  streak_days int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id AS friend_user_id,
    COALESCE(p.display_name, 'Friend') AS friend_name,
    f.updated_at AS since,
    p.last_seen_at,
    p.status_emoji,
    p.status_message,
    p.current_activity,
    CASE
      WHEN p.last_seen_at IS NULL THEN 'offline'
      WHEN p.last_seen_at > now() - interval '2 minutes' THEN 'online'
      WHEN p.last_seen_at > now() - interval '10 minutes' THEN 'away'
      ELSE 'offline'
    END AS presence,
    COALESCE(g.level, 1) AS level,
    COALESCE(g.streak_days, 0) AS streak_days
  FROM public.friendships f
  JOIN public.profiles p
    ON p.user_id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  LEFT JOIN public.gamification g ON g.user_id = p.user_id
  WHERE f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ORDER BY p.last_seen_at DESC NULLS LAST;
$$;