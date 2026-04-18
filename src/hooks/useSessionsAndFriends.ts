import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SessionRow {
  id: string;
  title: string;
  hints_used: number;
  status: "active" | "completed" | "abandoned";
  completed_at: string | null;
  created_at: string;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  type: string;
  message: string;
  created_at: string;
  display_name: string | null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return `${Math.floor(d / 7)}w`;
}

export function useSessionsAndFriends() {
  const [authed, setAuthed] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAuthed(false);
      setUserId(null);
      setSessions([]);
      setActivity([]);
      return;
    }
    setAuthed(true);
    setUserId(user.id);
    setLoading(true);

    const [sessRes, actRes] = await Promise.all([
      supabase
        .from("tutor_sessions")
        .select("id,title,hints_used,status,completed_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("activity_events")
        .select("id,user_id,type,message,created_at")
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (sessRes.data) setSessions(sessRes.data as SessionRow[]);

    if (actRes.data && actRes.data.length > 0) {
      const ids = Array.from(new Set(actRes.data.map((a) => a.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", ids);
      const nameById = new Map<string, string | null>(
        (profs ?? []).map((p) => [p.user_id, p.display_name]),
      );
      setActivity(
        actRes.data.map((a) => ({
          ...a,
          display_name: nameById.get(a.user_id) ?? null,
        })) as ActivityRow[],
      );
    } else {
      setActivity([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  // Realtime: refresh history & activity feed whenever sessions/activity change
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`sessions-activity-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tutor_sessions", filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Adapter-shaped values matching the previous mock interface
  const history = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    hintsUsed: s.hints_used,
    status: s.status,
    completedAt:
      s.status === "completed" && s.completed_at
        ? timeAgo(s.completed_at)
        : s.status === "active"
          ? "In progress"
          : timeAgo(s.created_at),
  }));

  const friends = activity.map((a) => ({
    id: a.id,
    name: a.display_name || "Someone",
    message: a.message,
    timeAgo: timeAgo(a.created_at),
  }));

  return { authed, userId, history, friends, loading, refresh };
}
