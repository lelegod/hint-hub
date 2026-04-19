import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MatchPair } from "@/lib/tutor/types";
import { RichText } from "./RichText";

interface Props {
  pairs?: MatchPair[];
  onRestart: () => void;
  onPlayAgain?: () => void;
}

interface Item {
  id: string;
  text: string;
  pairIndex: number;
  side: "left" | "right";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchGame({ pairs, onRestart, onPlayAgain }: Props) {
  const safePairs = pairs ?? [];

  const { lefts, rights } = useMemo(() => {
    const ls: Item[] = safePairs.map((p, i) => ({
      id: `L${i}`,
      text: p.left,
      pairIndex: i,
      side: "left",
    }));
    const rs: Item[] = safePairs.map((p, i) => ({
      id: `R${i}`,
      text: p.right,
      pairIndex: i,
      side: "right",
    }));
    return { lefts: shuffle(ls), rights: shuffle(rs) };
  }, [safePairs]);

  const [selectedLeft, setSelectedLeft] = useState<Item | null>(null);
  const [selectedRight, setSelectedRight] = useState<Item | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<{ left?: string; right?: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);

  // Resolve a pick when both sides are selected
  useEffect(() => {
    if (!selectedLeft || !selectedRight) return;
    if (selectedLeft.pairIndex === selectedRight.pairIndex) {
      setMatched((m) => new Set(m).add(selectedLeft.pairIndex));
      setSelectedLeft(null);
      setSelectedRight(null);
      setWrong(null);
    } else {
      setWrong({ left: selectedLeft.id, right: selectedRight.id });
      setMistakes((n) => n + 1);
      const t = setTimeout(() => {
        setWrong(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [selectedLeft, selectedRight]);

  // Empty state — user has no learned topics yet (placed AFTER all hooks to keep hook order stable)
  if (safePairs.length === 0) {
    return (
      <Card className="p-8 text-center shadow-soft animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-2xl text-foreground">No topics yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Play a few problems first to unlock your personalized mini-game! Each topic you
          practice grows your skill tree and feeds the matching game.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={onRestart}>Back to session</Button>
        </div>
      </Card>
    );
  }

  const allMatched = matched.size === safePairs.length;

  const tileClass = (item: Item, isSelected: boolean, isWrong: boolean) => {
    const isMatched = matched.has(item.pairIndex);
    return cn(
      "w-full rounded-md border px-3 py-3 text-left text-sm transition-all",
      isMatched && "border-success/40 bg-success-soft text-success cursor-default",
      !isMatched && isWrong && "border-destructive bg-destructive/10 text-destructive animate-pop-in",
      !isMatched && !isWrong && isSelected && "border-primary bg-primary text-primary-foreground shadow-soft",
      !isMatched && !isWrong && !isSelected &&
        "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40",
    );
  };

  return (
    <Card className="p-6 shadow-soft animate-fade-in">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Match game
          </div>
          <h3 className="mt-1 font-serif text-2xl text-foreground">Match each pair</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a term on the left, then its matching synonym or description on the right.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-muted-foreground">
            <div>
              Matched <span className="font-semibold text-foreground">{matched.size}/{safePairs.length}</span>
            </div>
            <div>
              Mistakes <span className="font-semibold text-foreground">{mistakes}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Close
          </Button>
        </div>
      </div>

      {!allMatched ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {lefts.map((item) => {
              const isSel = selectedLeft?.id === item.id;
              const isWrong = wrong?.left === item.id;
              const isMatched = matched.has(item.pairIndex);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isMatched}
                  onClick={() => !isMatched && setSelectedLeft(item)}
                  className={tileClass(item, isSel, isWrong)}
                >
                  <div className="flex items-center gap-2">
                    {isMatched && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    <RichText className="text-sm font-medium [&_p]:m-0">{item.text}</RichText>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            {rights.map((item) => {
              const isSel = selectedRight?.id === item.id;
              const isWrong = wrong?.right === item.id;
              const isMatched = matched.has(item.pairIndex);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isMatched}
                  onClick={() => !isMatched && setSelectedRight(item)}
                  className={tileClass(item, isSel, isWrong)}
                >
                  <div className="flex items-start gap-2">
                    {isMatched && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <RichText className="text-sm [&_p]:m-0">{item.text}</RichText>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-success/40 bg-success-soft p-4 text-center">
          <div className="font-serif text-xl text-foreground">All pairs matched</div>
          <p className="mt-1 text-sm text-foreground/80">
            {mistakes === 0
              ? "Perfect run — no mistakes!"
              : `Done in ${mistakes} mistake${mistakes === 1 ? "" : "s"}.`}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {onPlayAgain && (
              <Button variant="outline" onClick={onPlayAgain} className="gap-2">
                <RefreshCw className="h-4 w-4" /> New round
              </Button>
            )}
            <Button onClick={onRestart}>Back to session</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
