import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConnectionGroup } from "@/lib/tutor/types";

interface Props {
  groups: ConnectionGroup[];
  onRestart: () => void;
}

interface Tile {
  term: string;
  groupIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SOLVED_STYLE = "bg-success-soft text-success border-success/50";

export function ConnectionGame({ groups, onRestart }: Props) {
  const tiles = useMemo<Tile[]>(
    () => shuffle(groups.flatMap((g, gi) => g.terms.map((t) => ({ term: t, groupIndex: gi })))),
    [groups],
  );

  const [board, setBoard] = useState<Tile[]>(tiles);
  const [selected, setSelected] = useState<number[]>([]);
  const [solved, setSolved] = useState<ConnectionGroup[]>([]);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setBoard(tiles);
    setSolved([]);
    setSelected([]);
    setMessage(null);
  }, [tiles]);

  // Empty state — user has not learned enough topics yet (placed AFTER all hooks)
  if (groups.length === 0) {
    return (
      <Card className="p-8 text-center shadow-soft animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-2xl text-foreground">Not enough topics yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Learn a few topics first to unlock your personalized Connections game! Each topic
          you practice grows your skill tree and feeds the puzzle.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={onRestart}>Back</Button>
        </div>
      </Card>
    );
  }

  const toggle = (i: number) => {
    setMessage(null);
    setSelected((s) =>
      s.includes(i) ? s.filter((x) => x !== i) : s.length >= 4 ? s : [...s, i],
    );
  };

  const submit = () => {
    if (selected.length !== 4) return;
    const picks = selected.map((i) => board[i]);
    const sameGroup = picks.every((t) => t.groupIndex === picks[0].groupIndex);
    if (sameGroup) {
      const g = groups[picks[0].groupIndex];
      setSolved((s) => [...s, g]);
      setBoard((b) => b.filter((_, i) => !selected.includes(i)));
      setMessage(g.explanation);
      setSelected([]);
    } else {
      setShake(true);
      setMessage("Those 4 terms do not all belong to the same idea. Try again.");
      setTimeout(() => setShake(false), 500);
    }
  };

  const allSolved = solved.length === groups.length;

  return (
    <Card className="p-6 shadow-soft animate-fade-in">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Connection game
          </div>
          <h3 className="mt-1 font-serif text-2xl text-foreground">Group the related ideas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select 4 terms that connect, then submit.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
          <RefreshCw className="h-4 w-4" /> New session
        </Button>
      </div>

      {solved.length > 0 && (
        <div className="mb-4 space-y-2">
          {solved.map((g) => (
            <div
              key={g.theme}
              className={cn(
                "rounded-md border p-3 text-sm animate-pop-in",
                SOLVED_STYLE,
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {g.theme}
              </div>
              <div className="mt-1 text-xs opacity-80">{g.terms.join(" · ")}</div>
              <div className="mt-1 text-xs opacity-90">{g.explanation}</div>
            </div>
          ))}
        </div>
      )}

      {!allSolved && (
        <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", shake && "animate-pop-in")}>
          {board.map((t, i) => {
            const isSel = selected.includes(i);
            return (
              <button
                key={`${t.term}-${i}`}
                onClick={() => toggle(i)}
                className={cn(
                  "rounded-md border px-3 py-4 text-center text-sm font-medium transition-all",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                {t.term}
              </button>
            );
          })}
        </div>
      )}

      {message && !allSolved && (
        <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{message}</div>
      )}

      {!allSolved ? (
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} disabled={selected.length < 3}>
            Submit connection
          </Button>
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-success/40 bg-success-soft p-4 text-center">
          <div className="font-serif text-xl text-foreground">All connections found</div>
          <p className="mt-1 text-sm text-foreground/80">You locked in the concepts from this session.</p>
          <Button onClick={onRestart} className="mt-3">Start a new session</Button>
        </div>
      )}
    </Card>
  );
}
