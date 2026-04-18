-- Tighten friendship updates: only the addressee can change status
DROP POLICY IF EXISTS "Addressee can update friendship status" ON public.friendships;

CREATE POLICY "Addressee can update friendship status"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

-- Friend invites: only inviter can insert rows for themselves
CREATE POLICY "Inviter can insert own invites"
  ON public.friend_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);