import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TutorSession } from "@/hooks/useTutorSession";
import { HintActionBox } from "./HintActionBox";
import { FinalAnswerBox } from "./FinalAnswerBox";

interface Props {
  session: TutorSession;
}

export function ChatThread({ session }: Props) {
  const { status } = session;
  const isSetup = status === "setup";
  const canStart = session.problemSummary.trim().length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Which hint is currently shown in the main slide. Defaults to the live one.
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  // Animation direction for slide transition: "right" (new comes from right) or "left" (revisiting older)
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  // A nonce that forces remount of the slide so the animation replays.
  const [slideKey, setSlideKey] = useState(0);

  const showFinal =
    status === "awaiting_final" || status === "evaluating" || status === "completed";

  // Active hint index (the one the user is working on right now)
  const activeIdx = session.currentIndex;
  // The hint shown in the main viewport — defaults to the active one
  const shownIdx = viewIndex ?? activeIdx;
  const shownHint = session.hints[shownIdx];
  const isViewingPast = viewIndex !== null && viewIndex !== activeIdx;

  // When a NEW hint arrives, snap back to live view and animate from the right
  useEffect(() => {
    setViewIndex(null);
    setSlideDir("right");
    setSlideKey((k) => k + 1);
  }, [session.hints.length]);

  // When the chat itself scrolls (rarely), keep it pinned to bottom on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.hints.length, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canStart && isSetup) session.startSession();
  };

  const completedCount = session.hints.filter((h) => h.submitted).length;

  const goToHint = (idx: number) => {
    if (idx === shownIdx) return;
    setSlideDir(idx > shownIdx ? "right" : "left");
    setViewIndex(idx);
    setSlideKey((k) => k + 1);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Progress bar (only after session starts) */}
      {!isSetup && (
        <div className="border-b border-border bg-card/60 px-6 py-3">
          <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wide">
                {status === "awaiting_final"
                  ? "Final answer"
                  : status === "evaluating"
                    ? "Reviewing your answer"
                    : status === "completed"
                      ? "Session complete"
                      : `Hint ${Math.min(activeIdx + 1, session.totalHints)} of ${session.totalHints}`}
              </span>
              <span>
                {completedCount} / {session.totalHints} completed
              </span>
            </div>
            <Progress
              value={Math.min(100, (completedCount / session.totalHints) * 100)}
              className="h-1.5"
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col px-6",
            isSetup ? "min-h-full justify-center py-12" : "py-6",
          )}
        >
          {isSetup ? (
            <div className="animate-fade-in">
              <h1 className="text-center font-serif text-4xl leading-tight text-foreground sm:text-5xl">
                Hey!
                <br />
                <span className="text-muted-foreground">What should we learn for today?</span>
              </h1>
            </div>
          ) : (
            <div className="space-y-5">
              {/* User's original prompt as a chat bubble */}
              <div className="flex justify-end animate-fade-in">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary-soft px-4 py-3 text-sm text-foreground shadow-soft">
                  {session.problemSummary}
                </div>
              </div>

              {session.errorMsg && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {session.errorMsg}
                </div>
              )}

              {/* Hint timeline — only shown when there's more than one hint */}
              {session.hints.length > 1 && !showFinal && (
                <HintTimeline
                  total={session.hints.length}
                  hints={session.hints}
                  activeIdx={activeIdx}
                  shownIdx={shownIdx}
                  onSelect={goToHint}
                />
              )}

              {/* Sliding viewport — clip overflow so the slide animation looks contained */}
              <div className="relative overflow-hidden">
                {showFinal ? (
                  <div key="final" className="animate-slide-in-right">
                    <FinalAnswerBox session={session} />
                  </div>
                ) : shownHint ? (
                  <div
                    key={slideKey}
                    className={
                      slideDir === "right" ? "animate-slide-in-right" : "animate-slide-in-left"
                    }
                  >
                    {isViewingPast && (
                      <div className="mb-2 flex items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <span>You're reviewing a previous hint.</span>
                        <button
                          type="button"
                          onClick={() => goToHint(activeIdx)}
                          className="font-medium text-primary hover:underline"
                        >
                          Back to current →
                        </button>
                      </div>
                    )}
                    <HintActionBox
                      index={shownIdx}
                      total={session.totalHints}
                      entry={shownHint}
                      isCurrent={shownIdx === activeIdx && status === "active_hint"}
                      loadingNext={session.loadingHint}
                      onSelect={(i) => session.selectChoice(shownHint.id, i)}
                      onReason={(t) => session.setReasoning(shownHint.id, t)}
                      onSubmit={() => session.submitChoice(shownHint.id)}
                      onContinue={session.continueNext}
                    />
                  </div>
                ) : null}
              </div>

              {session.loadingHint && (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting the next hint...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Docked input at bottom — only shown on setup */}
      {isSetup && (
        <div className="border-t border-border/40 bg-background/60 px-6 py-5 backdrop-blur">
          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
            <div
              className={cn(
                "group relative flex items-center rounded-full border border-border bg-card pl-6 pr-2 shadow-soft transition-all",
                "focus-within:border-primary/60 focus-within:shadow-elevated",
              )}
            >
              <input
                type="text"
                placeholder="Describe the problem you want to learn..."
                value={session.problemSummary}
                onChange={(e) => session.setProblemSummary(e.target.value)}
                className="flex-1 bg-transparent py-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                disabled={!canStart}
                className="h-10 w-10 shrink-0 rounded-full"
                aria-label="Start learning"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {session.errorMsg && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
                {session.errorMsg}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

/* ---------- Hint timeline (clickable dots / pills) ---------- */

interface TimelineProps {
  total: number;
  hints: TutorSession["hints"];
  activeIdx: number;
  shownIdx: number;
  onSelect: (idx: number) => void;
}

function HintTimeline({ total, hints, activeIdx, shownIdx, onSelect }: TimelineProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {Array.from({ length: total }).map((_, i) => {
        const h = hints[i];
        const isShown = i === shownIdx;
        const isActive = i === activeIdx;
        const isDone = h?.submitted;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "group flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
              isShown
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : isDone
                  ? "border-success/40 bg-success-soft text-success hover:border-success"
                  : isActive
                    ? "border-primary/40 bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30",
            )}
            aria-label={`View hint ${i + 1}`}
          >
            {isDone ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="font-mono text-[10px] opacity-70">#</span>
            )}
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
