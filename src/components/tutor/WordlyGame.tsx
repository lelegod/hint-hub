import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WordlyPuzzle } from "@/lib/tutor/types";

interface Props {
  puzzle: WordlyPuzzle | null;
  streakDays: number;
  hasTopics: boolean;
  onRestart: () => void;
  onPlayAgain?: () => void;
}

const REQUIRED_STREAK = 15;
const MAX_GUESSES = 6;

type LetterState = "correct" | "present" | "absent" | "empty";
type KeyState = "correct" | "present" | "absent";

function evaluateGuess(guess: string, secret: string): LetterState[] {
  const result: LetterState[] = new Array(guess.length).fill("absent");
  const secretChars = secret.split("");
  const used: boolean[] = new Array(secret.length).fill(false);
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secretChars[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < secretChars.length; j++) {
      if (!used[j] && guess[i] === secretChars[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

export function WordlyGame({ puzzle, streakDays, hasTopics, onRestart, onPlayAgain }: Props) {
  const secret = useMemo(() => {
    if (!puzzle) return "";
    return puzzle.word.toUpperCase().replace(/[^A-Z]/g, "");
  }, [puzzle]);

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setGuesses([]);
    setCurrent("");
    setStatus("playing");
  }, [secret]);

  const locked = streakDays < REQUIRED_STREAK;
  const noTopics = !hasTopics;
  const playable = !locked && !noTopics && !!secret;

  useEffect(() => {
    if (!playable || status !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (current.length !== secret.length) {
          setShake(true);
          setTimeout(() => setShake(false), 400);
          return;
        }
        const next = [...guesses, current];
        setGuesses(next);
        setCurrent("");
        if (current === secret) setStatus("won");
        else if (next.length >= MAX_GUESSES) setStatus("lost");
      } else if (e.key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setCurrent((c) => (c.length < secret.length ? c + e.key.toUpperCase() : c));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [playable, secret, current, status, guesses]);

  const keyboardLetters = useMemo(() => {
    const map: Record<string, KeyState> = {};
    if (!secret) return map;
    for (const g of guesses) {
      const ev = evaluateGuess(g, secret);
      for (let i = 0; i < g.length; i++) {
        const ch = g[i];
        const s = ev[i];
        if (s === "empty") continue;
        const prev: KeyState | undefined = map[ch];
        if (prev === "correct") continue;
        if (s === "correct") {
          map[ch] = "correct";
        } else if (s === "present") {
          map[ch] = "present";
        } else if (!prev) {
          map[ch] = "absent";
        }
      }
    }
    return map;
  }, [guesses, secret]);

  // ---- Render gates (after all hooks) ----
  if (locked) {
    return (
      <Card className="p-8 text-center shadow-soft animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-2xl text-foreground">Wordly is locked</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Reach a {REQUIRED_STREAK}-day streak to unlock Wordly! You're at {streakDays} day{streakDays === 1 ? "" : "s"} —
          keep showing up.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={onRestart}>Back</Button>
        </div>
      </Card>
    );
  }

  if (noTopics) {
    return (
      <Card className="p-8 text-center shadow-soft animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-2xl text-foreground">No topics yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Learn a topic to unlock your personalized Wordly puzzles!
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={onRestart}>Start learning</Button>
        </div>
      </Card>
    );
  }

  if (!puzzle || !secret) {
    return (
      <Card className="p-8 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">Building today's word…</p>
      </Card>
    );
  }

  const submit = () => {
    if (current.length !== secret.length) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    if (current === secret) setStatus("won");
    else if (next.length >= MAX_GUESSES) setStatus("lost");
  };

  const rows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "BACK"],
  ];

  const tileClass = (s: LetterState) =>
    cn(
      "flex items-center justify-center rounded-md border text-base font-bold uppercase transition-all",
      s === "correct" && "border-success bg-success-soft text-success",
      s === "present" && "border-accent bg-accent-soft text-accent",
      s === "absent" && "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
      s === "empty" && "border-border bg-card text-foreground",
    );

  return (
    <Card className="p-6 shadow-soft animate-fade-in">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Wordly
          </div>
          <h3 className="mt-1 font-serif text-2xl text-foreground">Guess the {secret.length}-letter word</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hint: {puzzle.hint} <span className="text-xs opacity-60">(from {puzzle.topic})</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Close
        </Button>
      </div>

      <div className={cn("mx-auto grid w-fit gap-1.5", shake && "animate-pop-in")}>
        {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
          const guess = guesses[rowIdx];
          const isCurrent = rowIdx === guesses.length && status === "playing";
          const ev = guess ? evaluateGuess(guess, secret) : null;
          return (
            <div
              key={rowIdx}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${secret.length}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: secret.length }).map((__, i) => {
                const ch = guess ? guess[i] : isCurrent ? current[i] ?? "" : "";
                const s: LetterState = guess ? ev![i] : "empty";
                return (
                  <div key={i} className={cn(tileClass(s), "h-11 w-11 sm:h-12 sm:w-12")}>
                    {ch}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {status === "won" && (
        <div className="mt-5 rounded-md border border-success/40 bg-success-soft p-4 text-center animate-pop-in">
          <div className="font-serif text-xl text-foreground">You cracked today's Wordly!</div>
          <p className="mt-1 text-sm text-foreground/80">
            The word was <span className="font-semibold">{secret}</span>.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {onPlayAgain && (
              <Button variant="outline" onClick={onPlayAgain} className="gap-2">
                <RefreshCw className="h-4 w-4" /> New word
              </Button>
            )}
            <Button onClick={onRestart}>Done</Button>
          </div>
        </div>
      )}

      {status === "lost" && (
        <div className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center">
          <div className="font-serif text-xl text-foreground">Try again tomorrow!</div>
          <p className="mt-1 text-sm text-foreground/80">
            The word was <span className="font-semibold">{secret}</span>.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {onPlayAgain && (
              <Button variant="outline" onClick={onPlayAgain} className="gap-2">
                <RefreshCw className="h-4 w-4" /> New word
              </Button>
            )}
            <Button onClick={onRestart}>Done</Button>
          </div>
        </div>
      )}

      {status === "playing" && (
        <div className="mt-5 space-y-1.5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1">
              {row.map((k) => {
                const isAction = k === "ENTER" || k === "BACK";
                const s = keyboardLetters[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === "ENTER") submit();
                      else if (k === "BACK") setCurrent((c) => c.slice(0, -1));
                      else setCurrent((c) => (c.length < secret.length ? c + k : c));
                    }}
                    className={cn(
                      "rounded-md border px-2 py-2.5 text-xs font-semibold uppercase transition-colors",
                      isAction ? "min-w-[3.5rem]" : "min-w-[2rem]",
                      s === "correct" && "border-success bg-success-soft text-success",
                      s === "present" && "border-accent bg-accent-soft text-accent",
                      s === "absent" && "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
                      !s && "border-border bg-card text-foreground hover:bg-muted/40",
                    )}
                  >
                    {k === "BACK" ? "⌫" : k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
