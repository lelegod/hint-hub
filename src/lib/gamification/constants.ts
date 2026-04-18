export const XP_PER_HINT = 25;
export const XP_PER_CORRECT_BONUS = 15;
export const XP_PER_SESSION_COMPLETE = 75;

/** XP needed to reach `level` (cumulative). Curve: 100 * level^1.4 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(level - 1, 1.4));
}

/** Given total XP, derive level and progress within it */
export function levelFromXp(xp: number): {
  level: number;
  intoLevel: number;
  needed: number;
  pct: number;
} {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const intoLevel = xp - base;
  const needed = next - base;
  return { level, intoLevel, needed, pct: needed === 0 ? 0 : Math.round((intoLevel / needed) * 100) };
}

/** Hybrid token regen: 1 token per 30 minutes, capped at max */
export const TOKEN_REGEN_MS = 30 * 60 * 1000;

export function regenerateTokens(current: number, max: number, lastRegenISO: string): {
  tokens: number;
  newLastRegenAt: string;
} {
  if (current >= max) return { tokens: current, newLastRegenAt: new Date().toISOString() };
  const last = new Date(lastRegenISO).getTime();
  const elapsed = Date.now() - last;
  const earned = Math.floor(elapsed / TOKEN_REGEN_MS);
  if (earned <= 0) return { tokens: current, newLastRegenAt: lastRegenISO };
  const tokens = Math.min(max, current + earned);
  const newLast = new Date(last + earned * TOKEN_REGEN_MS).toISOString();
  return { tokens, newLastRegenAt: newLast };
}

/** Brain heat: each step heats by +18, decays after 30s of inactivity */
export const HEAT_GAIN_PER_STEP = 18;
export const HEAT_DECAY_AFTER_MS = 30_000;
export const HEAT_DECAY_PER_SEC = 1.5;
export const HEAT_MAX = 100;

/** Streak helpers — UTC date string */
export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Milestone definitions — when to celebrate */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
