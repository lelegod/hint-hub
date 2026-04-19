import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingRequest {
  friendship_id: string;
  requester_id: string;
  requester_name: string;
  created_at: string;
}

export type Presence = "online" | "away" | "offline";

export interface FriendRow {
  friend_user_id: string;
  friend_name: string;
  since: string;
  last_seen_at: string | null;
  status_emoji: string | null;
  status_message: string | null;
  current_activity: string | null;
  presence: Presence;
  level: number;
  streak_days: number;
}

export interface MyStatus {
  status_emoji: string | null;
  status_message: string | null;
  current_activity: string | null;
}

export type InviteResult =
  | { status: "request_sent"; message: string }
  | { status: "already_friends"; message: string }
  | { status: "already_pending"; message: string }
  | { status: "invite_created"; message: string; token: string; email: string }
  | { status: "error"; message: string };

export function useFriends() {
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [myStatus, setMyStatus] = useState<MyStatus>({
    status_emoji: null,
    status_message: null,
    current_activity: null,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    const [pRes, fRes, meRes] = await Promise.all([
      supabase.rpc("list_pending_friend_requests"),
      supabase.rpc("list_friends"),
      uid
        ? supabase
            .from("profiles")
            .select("status_emoji, status_message, current_activity")
            .eq("user_id", uid)
            .maybeSingle()
        : Promise.resolve({ data: null as MyStatus | null }),
    ]);
    if (pRes.data) setPending(pRes.data as PendingRequest[]);
    if (fRes.data) setFriends(fRes.data as FriendRow[]);
    if (meRes.data) setMyStatus(meRes.data as MyStatus);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const sendRequestByEmail = useCallback(
    async (email: string): Promise<InviteResult> => {
      const { data, error } = await supabase.rpc("send_friend_request_by_email", {
        _email: email,
      });
      if (error) return { status: "error", message: error.message };
      const result = data as unknown as InviteResult;
      await refresh();
      return result;
    },
    [refresh],
  );

  const acceptRequest = useCallback(
    async (friendshipId: string) => {
      const { error } = await supabase.rpc("accept_friend_request", {
        _friendship_id: friendshipId,
      });
      if (!error) await refresh();
      return !error;
    },
    [refresh],
  );

  const declineRequest = useCallback(
    async (friendshipId: string) => {
      const { error } = await supabase.rpc("decline_friend_request", {
        _friendship_id: friendshipId,
      });
      if (!error) await refresh();
      return !error;
    },
    [refresh],
  );

  const updateMyStatus = useCallback(
    async (emoji: string, message: string) => {
      const { error } = await supabase.rpc("update_my_status", {
        _emoji: emoji,
        _message: message,
      });
      if (!error) {
        setMyStatus((s) => ({ ...s, status_emoji: emoji || null, status_message: message || null }));
      }
      return !error;
    },
    [],
  );

  return {
    pending,
    friends,
    myStatus,
    loading,
    refresh,
    sendRequestByEmail,
    acceptRequest,
    declineRequest,
    updateMyStatus,
  };
}
