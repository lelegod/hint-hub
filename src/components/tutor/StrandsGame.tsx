import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StrandsPuzzle } from "@/lib/tutor/types";

interface Props {
  puzzle: StrandsPuzzle | null;
  onRestart: () => void;
  onPlayAgain?: () => void;
}

const GRID_SIZE = 8;
const DIRS: Array<[number, number]> = [
  [0, 1], [1, 0], [1, 1], [-1, 1],
  [0, -1], [-1, 0], [-1, -1], [1, -1],
];

interface Placed {
  word: string;
  cells: number[]; // flat indices
}

interface Built {
  grid: string[]; // length GRID_SIZE*GRID_SIZE
  placed: Placed[];
}

function emptyGrid(): string[] {
  return new Array(GRID_SIZE * GRID_SIZE).fill("");
}

function rcToIdx(r: number, c: number) {
  return r * GRID_SIZE + c;
}

function tryPlace(
  grid: string[],
  word: string,
  r: number,
  c: number,
  dr: number,
  dc: number,
): number[] | null {
  const cells: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    if (rr < 0 || rr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) return null;
    const idx = rcToIdx(rr, cc);
    const existing = grid[idx];
    if (existing && existing !== word[i]) return null;
    cells.push(idx);
  }
  return cells;
}

function buildGrid(words: string[]): Built {
  const cleaned = words
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 3 && w.length <= GRID_SIZE);

  // Try multiple seeds for a denser fill
  let best: Built | null = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const grid = emptyGrid();
    const placed: Placed[] = [];
    const sorted = [...cleaned].sort((a, b) => b.length - a.length);
    for (const w of sorted) {
      const tries: Array<[number, number, number, number]> = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          for (const [dr, dc] of DIRS) {
            tries.push([r, c, dr, dc]);
          }
        }
      }
      // shuffle
      for (let i = tries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tries[i], tries[j]] = [tries[j], tries[i]];
      }
      let placedThis = false;
      for (const [r, c, dr, dc] of tries) {
        const cells = tryPlace(grid, w, r, c, dr, dc);
        if (cells) {
          for (let i = 0; i < w.length; i++) grid[cells[i]] = w[i];
          placed.push({ word: w, cells });
          placedThis = true;
          break;
        }
      }
      if (!placedThis) break;
    }
    if (placed.length === cleaned.length) {
      best = { grid, placed };
      break;
    }
    if (!best || placed.length > best.placed.length) {
      best = { grid, placed };
    }
  }

  // Fill empty cells with random letters
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const final = (best ?? { grid: emptyGrid(), placed: [] });
  for (let i = 0; i < final.grid.length; i++) {
    if (!final.grid[i]) final.grid[i] = ALPHA[Math.floor(Math.random() * ALPHA.length)];
  }
  return final;
}

function cellsFromPath(path: number[]): number[] {
  return path;
}

function pathToString(grid: string[], path: number[]): string {
  return path.map((i) => grid[i]).join("");
}

function isAdjacent(a: number, b: number) {
  const ar = Math.floor(a / GRID_SIZE);
  const ac = a % GRID_SIZE;
  const br = Math.floor(b / GRID_SIZE);
  const bc = b % GRID_SIZE;
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1 && !(ar === br && ac === bc);
}

export function StrandsGame({ puzzle, onRestart, onPlayAgain }: Props) {
  const built = useMemo(() => (puzzle ? buildGrid(puzzle.words) : null), [puzzle]);
  const [path, setPath] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCells, setFoundCells] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isPointerDown = useRef(false);

  useEffect(() => {
    setPath([]);
    setFoundWords(new Set());
    setFoundCells(new Set());
    setMessage(null);
  }, [built]);

  if (!puzzle || puzzle.words.length === 0) {
    return (
      <Card className="p-8 text-center shadow-soft animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-2xl text-foreground">Not enough topics yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Learn a few topics first to unlock your personalized Strands puzzle!
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={onRestart}>Start learning</Button>
        </div>
      </Card>
    );
  }

  if (!built) return null;

  const placedWords = built.placed.map((p) => p.word);
  const allFound = placedWords.length > 0 && placedWords.every((w) => foundWords.has(w));

  const tryFinishPath = (currentPath: number[]) => {
    const word = pathToString(built.grid, currentPath);
    const reverse = word.split("").reverse().join("");
    const match = built.placed.find(
      (p) => !foundWords.has(p.word) && (p.word === word || p.word === reverse),
    );
    if (match) {
      setFoundWords((s) => new Set(s).add(match.word));
      setFoundCells((s) => {
        const ns = new Set(s);
        match.cells.forEach((c) => ns.add(c));
        return ns;
      });
      setMessage(`Nice — ${match.word.toLowerCase()} found!`);
      setPath([]);
    } else if (currentPath.length >= 3) {
      setShake(true);
      setMessage("Not a word from this theme. Try again.");
      setTimeout(() => setShake(false), 400);
      setPath([]);
    } else {
      setPath([]);
    }
  };

  const onPointerDown = (i: number) => {
    if (foundCells.has(i)) return;
    isPointerDown.current = true;
    setMessage(null);
    setPath([i]);
  };
  const onPointerEnter = (i: number) => {
    if (!isPointerDown.current) return;
    if (foundCells.has(i)) return;
    setPath((p) => {
      if (p.length === 0) return [i];
      if (p.includes(i)) {
        // backtrack
        const idx = p.indexOf(i);
        return p.slice(0, idx + 1);
      }
      const last = p[p.length - 1];
      if (!isAdjacent(last, i)) return p;
      return [...p, i];
    });
  };
  const onPointerUp = () => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    if (path.length === 0) return;
    tryFinishPath(path);
  };

  const onCellClick = (i: number) => {
    if (foundCells.has(i)) return;
    setMessage(null);
    setPath((p) => {
      if (p.length === 0) return [i];
      if (p[p.length - 1] === i) {
        // submit when tapping the last cell again
        tryFinishPath(p);
        return p;
      }
      if (p.includes(i)) {
        const idx = p.indexOf(i);
        return p.slice(0, idx + 1);
      }
      const last = p[p.length - 1];
      if (!isAdjacent(last, i)) return [i];
      return [...p, i];
    });
  };

  return (
    <Card className="p-6 shadow-soft animate-fade-in">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Strands
          </div>
          <h3 className="mt-1 font-serif text-2xl text-foreground">{puzzle.theme}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag (or tap then re-tap) to trace hidden words from this topic. Words run in any direction.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Close
        </Button>
      </div>

      {!allFound ? (
        <div
          className={cn("mx-auto w-fit select-none", shake && "animate-pop-in")}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {built.grid.map((ch, i) => {
              const inPath = path.includes(i);
              const isFound = foundCells.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onPointerDown={() => onPointerDown(i)}
                  onPointerEnter={() => onPointerEnter(i)}
                  onClick={() => onCellClick(i)}
                  className={cn(
                    "h-10 w-10 rounded-md border text-sm font-semibold transition-all sm:h-11 sm:w-11",
                    isFound
                      ? "border-success/50 bg-success-soft text-success"
                      : inPath
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-success/40 bg-success-soft p-4 text-center animate-pop-in">
          <div className="font-serif text-xl text-foreground">All words found!</div>
          <p className="mt-1 text-sm text-foreground/80">
            You spotted every concept from {puzzle.theme}.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {onPlayAgain && (
              <Button variant="outline" onClick={onPlayAgain} className="gap-2">
                <RefreshCw className="h-4 w-4" /> New puzzle
              </Button>
            )}
            <Button onClick={onRestart}>Done</Button>
          </div>
        </div>
      )}

      {message && !allFound && (
        <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-center text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Words to find ({foundWords.size}/{placedWords.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {placedWords.map((w) => {
            const found = foundWords.has(w);
            return (
              <span
                key={w}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                  found
                    ? "border-success/40 bg-success-soft text-success"
                    : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {found ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> {w}
                  </>
                ) : (
                  <span>{"•".repeat(w.length)}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
