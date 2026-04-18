-- =========================================
-- FRIEND INVITES (for not-yet-registered users)
-- =========================================
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired');

CREATE TABLE public.friend_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL,
  invited_email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT friend_invites_unique UNIQUE (inviter_id, invited_email)
);

CREATE INDEX idx_friend_invites_email ON public.friend_invites(LOWER(invited_email));
CREATE INDEX idx_friend_invites_inviter ON public.friend_invites(inviter_id);

ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can view own invites"
  ON public.friend_invites FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Inviter can delete own invites"
  ON public.friend_invites FOR DELETE
  USING (auth.uid() = inviter_id);

-- INSERT happens via SECURITY DEFINER RPC only

-- =========================================
-- RPC: send friend request by email
-- =========================================
CREATE OR REPLACE FUNCTION public.send_friend_request_by_email(_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me UUID := auth.uid();
  _target_user UUID;
  _normalized TEXT := LOWER(TRIM(_email));
  _existing_friendship public.friendships%ROWTYPE;
  _invite_token UUID;
BEGIN
  IF _me IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  END IF;

  IF _normalized = '' OR _normalized IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Email required');
  END IF;

  -- Look up the user (without exposing auth.users)
  SELECT id INTO _target_user
  FROM auth.users
  WHERE LOWER(email) = _normalized
  LIMIT 1;

  IF _target_user IS NOT NULL THEN
    IF _target_user = _me THEN
      RETURN jsonb_build_object('status', 'error', 'message', 'You cannot add yourself');
    END IF;

    -- Check for existing friendship in either direction
    SELECT * INTO _existing_friendship
    FROM public.friendships
    WHERE (requester_id = _me AND addressee_id = _target_user)
       OR (requester_id = _target_user AND addressee_id = _me)
    LIMIT 1;

    IF FOUND THEN
      IF _existing_friendship.status = 'accepted' THEN
        RETURN jsonb_build_object('status', 'already_friends', 'message', 'You are already friends');
      ELSIF _existing_friendship.status = 'pending' THEN
        RETURN jsonb_build_object('status', 'already_pending', 'message', 'A request is already pending');
      END IF;
    END IF;

    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (_me, _target_user, 'pending')
    ON CONFLICT (requester_id, addressee_id) DO NOTHING;

    RETURN jsonb_build_object('status', 'request_sent', 'message', 'Friend request sent');
  END IF;

  -- Not a user — create or refresh invite record, return token for email
  INSERT INTO public.friend_invites (inviter_id, invited_email)
  VALUES (_me, _normalized)
  ON CONFLICT (inviter_id, invited_email) DO UPDATE
    SET status = 'pending', created_at = now()
  RETURNING token INTO _invite_token;

  RETURN jsonb_build_object(
    'status', 'invite_created',
    'message', 'Invite ready to send',
    'token', _invite_token,
    'email', _normalized
  );
END;
$$;

-- =========================================
-- RPC: list pending incoming friend requests (with names)
-- =========================================
CREATE OR REPLACE FUNCTION public.list_pending_friend_requests()
RETURNS TABLE (
  friendship_id UUID,
  requester_id UUID,
  requester_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id AS friendship_id,
    f.requester_id,
    COALESCE(p.display_name, 'Someone') AS requester_name,
    f.created_at
  FROM public.friendships f
  LEFT JOIN public.profiles p ON p.user_id = f.requester_id
  WHERE f.addressee_id = auth.uid()
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
$$;

-- =========================================
-- RPC: list accepted friends (with names)
-- =========================================
CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE (
  friend_user_id UUID,
  friend_name TEXT,
  since TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS friend_user_id,
    COALESCE(p.display_name, 'Friend') AS friend_name,
    f.updated_at AS since
  FROM public.friendships f
  LEFT JOIN public.profiles p
    ON p.user_id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ORDER BY f.updated_at DESC;
$$;

-- =========================================
-- RPC: accept / decline friend request
-- =========================================
CREATE OR REPLACE FUNCTION public.accept_friend_request(_friendship_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.friendships%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.friendships WHERE id = _friendship_id;
  IF NOT FOUND OR _row.addressee_id <> auth.uid() OR _row.status <> 'pending' THEN
    RETURN false;
  END IF;
  UPDATE public.friendships
    SET status = 'accepted', updated_at = now()
    WHERE id = _friendship_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_friend_request(_friendship_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.friendships%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.friendships WHERE id = _friendship_id;
  IF NOT FOUND OR _row.addressee_id <> auth.uid() THEN
    RETURN false;
  END IF;
  DELETE FROM public.friendships WHERE id = _friendship_id;
  RETURN true;
END;
$$;

-- =========================================
-- TRIGGER: auto-accept invites on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.auto_accept_friend_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
BEGIN
  FOR _inv IN
    SELECT * FROM public.friend_invites
    WHERE LOWER(invited_email) = LOWER(NEW.email)
      AND status = 'pending'
  LOOP
    -- Create accepted friendship
    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (_inv.inviter_id, NEW.id, 'accepted')
    ON CONFLICT (requester_id, addressee_id) DO UPDATE
      SET status = 'accepted', updated_at = now();

    UPDATE public.friend_invites
      SET status = 'accepted', accepted_at = now()
      WHERE id = _inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Hook into the existing handle_new_user flow by adding a separate trigger
DROP TRIGGER IF EXISTS on_auth_user_created_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_accept_friend_invites();

-- Ensure profile/gamification trigger exists too (handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();