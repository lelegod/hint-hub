/**
 * Tiny Web Audio synth for game-feel SFX. No assets required.
 * Each function plays a short tone or chord.
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
  }
  // Auto-resume after user gesture
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem("tutorly:muted", v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("tutorly:muted") === "1";
  } catch {
    return muted;
  }
}

interface ToneOpts {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  attack?: number;
  release?: number;
  volume?: number;
  delay?: number;
}

function tone({ freq, duration = 0.18, type = "sine", attack = 0.005, release = 0.08, volume = 0.18, delay = 0 }: ToneOpts) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + attack);
  gain.gain.linearRampToValueAtTime(0, t0 + duration + release);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + release + 0.05);
}

/** Soft "click" feedback */
export const sfxClick = () => tone({ freq: 520, duration: 0.05, type: "triangle", volume: 0.08 });

/** Correct answer — bright two-note arpeggio */
export const sfxCorrect = () => {
  tone({ freq: 660, duration: 0.1, type: "triangle", volume: 0.16 });
  tone({ freq: 990, duration: 0.16, type: "triangle", volume: 0.18, delay: 0.08 });
};

/** Wrong answer — short low thud */
export const sfxWrong = () => tone({ freq: 180, duration: 0.18, type: "sawtooth", volume: 0.1 });

/** XP gain — quick rising blip */
export const sfxXp = () => {
  tone({ freq: 740, duration: 0.06, type: "sine", volume: 0.14 });
  tone({ freq: 1108, duration: 0.08, type: "sine", volume: 0.14, delay: 0.05 });
};

/** Level up — triumphant 3-note */
export const sfxLevelUp = () => {
  tone({ freq: 523, duration: 0.12, type: "triangle", volume: 0.2 });
  tone({ freq: 659, duration: 0.12, type: "triangle", volume: 0.2, delay: 0.1 });
  tone({ freq: 880, duration: 0.22, type: "triangle", volume: 0.22, delay: 0.2 });
};

/** Streak milestone — playful */
export const sfxStreak = () => {
  tone({ freq: 880, duration: 0.08, type: "sine", volume: 0.18 });
  tone({ freq: 1175, duration: 0.08, type: "sine", volume: 0.18, delay: 0.07 });
  tone({ freq: 1480, duration: 0.14, type: "sine", volume: 0.2, delay: 0.14 });
};

/** Token spent — soft bloop */
export const sfxToken = () => tone({ freq: 320, duration: 0.1, type: "sine", volume: 0.12 });

/** Skill unlocked */
export const sfxUnlock = () => {
  tone({ freq: 440, duration: 0.1, type: "triangle", volume: 0.16 });
  tone({ freq: 660, duration: 0.1, type: "triangle", volume: 0.18, delay: 0.08 });
  tone({ freq: 880, duration: 0.18, type: "triangle", volume: 0.2, delay: 0.16 });
};
