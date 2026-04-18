import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  HEAT_DECAY_AFTER_MS,
  HEAT_DECAY_PER_SEC,
  HEAT_GAIN_PER_STEP,
  HEAT_MAX,
  STREAK_MILESTONES,
  XP_PER_CORRECT_BONUS,
  XP_PER_HINT,
  XP_PER_SESSION_COMPLETE,
  daysBetween,
  levelFromXp,
  regenerateTokens,
  todayDateStr,
} from "@/lib/gamification/constants";
import { sfxLevelUp, sfxStreak, sfxToken, sfxUnlock, sfxXp } from "@/lib/sound";

export interface GamificationState {
  xp: number;
  level: number;
  streak_days: number;
  streak_freezes: number;
  last_active_date: string | null;
  hint_tokens: number;
  max_hint_tokens: number;
  last_token_regen_at: string;
  brain_heat: number;
  brain_heat_updated_at: string;
  total_hints_solved: number;
  total_sessions_completed: number;
}

export interface SkillNode {
  id: string;
  topic: string;
  parent_topic: string | null;
  mastery: number;
  times_practiced: number;
}

export type RewardKind = "level_up" | "streak" | "skill_unlock" | "milestone";
export interface RewardEvent {
  id: string;
  kind: RewardKind;
  title: string;
  subtitle?: string;
  emoji?: string;
}

interface GamificationContextValue {
  loading: boolean;
  authed: boolean;
  state: GamificationState | null;
  skillNodes: SkillNode[];
  rewards: RewardEvent[];
  consumeReward: (id: string) => void;
  /** Award XP for solving one hint. Returns the new state. */
  awardHintXp: (wasCorrect: boolean) => Promise<void>;
  /** Award bonus XP at session completion */
  awardSessionComplete: () => Promise<void>;
  /** Try to spend one hint token. Returns true on success. */
  spendHintToken: () => Promise<boolean>;
  /** Add a brain-heat tick (e.g. after solving a step) */
  bumpHeat: () => void;
  /** Touch streak — call on first action of the day */
  touchStreak: () => Promise<void>;
  /** Upsert a skill node by topic name */
  practiceTopic: (topic: string, parent?: string | null) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<GamificationState | null>(null);
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
  const [rewards, setRewards] = useState<RewardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Local heat decay timer
  const heatRef = useRef<{ value: number; updatedAt: number }>({ value: 0, updatedAt: Date.now() });

  const pushReward = useCallback((r: Omit<RewardEvent, "id">) => {
    setRewards((rs) => [...rs, { ...r, id: crypto.randomUUID() }]);
  }, []);

  const consumeReward = useCallback((id: string) => {
    setRewards((rs) => rs.filter((r) => r.id !== id));
  }, []);

  // ---- Auth bootstrap ----
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- Load state when authed ----
  const loadState = useCallback(async (uid: string) => {
    const { data: g } = await supabase.from("gamification").select("*").eq("user_id", uid).maybeSingle();
    if (g) {
      // Apply token regen on load
      const { tokens, newLastRegenAt } = regenerateTokens(g.hint_tokens, g.max_hint_tokens, g.last_token_regen_at);
      const next: GamificationState = { ...g, hint_tokens: tokens, last_token_regen_at: newLastRegenAt };
      setState(next);
      heatRef.current = { value: g.brain_heat, updatedAt: new Date(g.brain_heat_updated_at).getTime() };
      if (tokens !== g.hint_tokens) {
        await supabase.from("gamification").update({ hint_tokens: tokens, last_token_regen_at: newLastRegenAt }).eq("user_id", uid);
      }
    }
    const { data: nodes } = await supabase.from("skill_nodes").select("*").eq("user_id", uid).order("unlocked_at", { ascending: true });
    setSkillNodes((nodes ?? []) as SkillNode[]);
  }, []);

  useEffect(() => {
    if (userId) {
      void loadState(userId);
    } else {
      setState(null);
      setSkillNodes([]);
    }
  }, [userId, loadState]);

  // ---- Heat decay loop ----
  useEffect(() => {
    if (!state) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const sinceUpdate = now - heatRef.current.updatedAt;
      if (sinceUpdate > HEAT_DECAY_AFTER_MS && heatRef.current.value > 0) {
        const decayed = Math.max(0, heatRef.current.value - HEAT_DECAY_PER_SEC);
        heatRef.current = { value: decayed, updatedAt: heatRef.current.updatedAt };
        setState((s) => (s ? { ...s, brain_heat: Math.round(decayed) } : s));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // ---- Update helpers ----
  const updateGamification = useCallback(
    async (patch: Partial<GamificationState>) => {
      if (!userId || !state) return;
      const next = { ...state, ...patch };
      setState(next);
      await supabase.from("gamification").update(patch).eq("user_id", userId);
    },
    [userId, state],
  );

  const awardHintXp = useCallback(
    async (wasCorrect: boolean) => {
      if (!state) return;
      const gained = XP_PER_HINT + (wasCorrect ? XP_PER_CORRECT_BONUS : 0);
      const newXp = state.xp + gained;
      const before = levelFromXp(state.xp);
      const after = levelFromXp(newXp);
      sfxXp();
      await updateGamification({
        xp: newXp,
        level: after.level,
        total_hints_solved: state.total_hints_solved + 1,
      });
      if (after.level > before.level) {
        sfxLevelUp();
        pushReward({
          kind: "level_up",
          title: `Level ${after.level} reached!`,
          subtitle: `You earned +${gained} XP`,
          emoji: "✨",
        });
      }
    },
    [state, updateGamification, pushReward],
  );

  const awardSessionComplete = useCallback(async () => {
    if (!state) return;
    const newXp = state.xp + XP_PER_SESSION_COMPLETE;
    const before = levelFromXp(state.xp);
    const after = levelFromXp(newXp);
    await updateGamification({
      xp: newXp,
      level: after.level,
      total_sessions_completed: state.total_sessions_completed + 1,
    });
    pushReward({
      kind: "milestone",
      title: "Session complete!",
      subtitle: `+${XP_PER_SESSION_COMPLETE} XP`,
      emoji: "🎉",
    });
    if (after.level > before.level) {
      sfxLevelUp();
      pushReward({ kind: "level_up", title: `Level ${after.level} reached!`, emoji: "✨" });
    }
  }, [state, updateGamification, pushReward]);

  const spendHintToken = useCallback(async (): Promise<boolean> => {
    if (!state) return false;
    if (state.hint_tokens <= 0) return false;
    sfxToken();
    await updateGamification({ hint_tokens: state.hint_tokens - 1 });
    return true;
  }, [state, updateGamification]);

  const bumpHeat = useCallback(() => {
    if (!state) return;
    const nextVal = Math.min(HEAT_MAX, heatRef.current.value + HEAT_GAIN_PER_STEP);
    heatRef.current = { value: nextVal, updatedAt: Date.now() };
    setState((s) => (s ? { ...s, brain_heat: Math.round(nextVal), brain_heat_updated_at: new Date().toISOString() } : s));
    // Persist heat opportunistically (debounced via fire-and-forget)
    if (userId) {
      void supabase
        .from("gamification")
        .update({ brain_heat: Math.round(nextVal), brain_heat_updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
  }, [state, userId]);

  const touchStreak = useCallback(async () => {
    if (!state) return;
    const today = todayDateStr();
    if (state.last_active_date === today) return;
    let streak = state.streak_days;
    let freezes = state.streak_freezes;
    if (!state.last_active_date) {
      streak = 1;
    } else {
      const gap = daysBetween(state.last_active_date, today);
      if (gap === 1) {
        streak = streak + 1;
      } else if (gap === 2 && freezes > 0) {
        // Use a streak freeze
        freezes -= 1;
        // streak preserved
      } else {
        // Streak broken
        streak = 1;
      }
    }
    await updateGamification({
      streak_days: streak,
      streak_freezes: freezes,
      last_active_date: today,
    });
    if (STREAK_MILESTONES.includes(streak)) {
      sfxStreak();
      pushReward({
        kind: "streak",
        title: `${streak}-day streak!`,
        subtitle: "Keep showing up — momentum compounds.",
        emoji: "🔥",
      });
    }
  }, [state, updateGamification, pushReward]);

  const practiceTopic = useCallback(
    async (topic: string, parent: string | null = null) => {
      if (!userId) return;
      const cleanTopic = topic.trim().slice(0, 80);
      if (!cleanTopic) return;
      const existing = skillNodes.find((n) => n.topic.toLowerCase() === cleanTopic.toLowerCase());
      if (existing) {
        const newMastery = Math.min(100, existing.mastery + 8);
        const updated = { ...existing, mastery: newMastery, times_practiced: existing.times_practiced + 1 };
        setSkillNodes((ns) => ns.map((n) => (n.id === existing.id ? updated : n)));
        await supabase.from("skill_nodes").update({ mastery: newMastery, times_practiced: updated.times_practiced }).eq("id", existing.id);
      } else {
        const insertRow = { user_id: userId, topic: cleanTopic, parent_topic: parent, mastery: 5, times_practiced: 1 };
        const { data } = await supabase.from("skill_nodes").insert(insertRow).select().single();
        if (data) {
          setSkillNodes((ns) => [...ns, data as SkillNode]);
          sfxUnlock();
          pushReward({
            kind: "skill_unlock",
            title: "New skill unlocked",
            subtitle: cleanTopic,
            emoji: "🌱",
          });
        }
      }
    },
    [userId, skillNodes, pushReward],
  );

  const value = useMemo<GamificationContextValue>(
    () => ({
      loading,
      authed,
      state,
      skillNodes,
      rewards,
      consumeReward,
      awardHintXp,
      awardSessionComplete,
      spendHintToken,
      bumpHeat,
      touchStreak,
      practiceTopic,
    }),
    [loading, authed, state, skillNodes, rewards, consumeReward, awardHintXp, awardSessionComplete, spendHintToken, bumpHeat, touchStreak, practiceTopic],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification must be used within GamificationProvider");
  return ctx;
}
