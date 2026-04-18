import { useEffect, useRef } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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

  // Auto-scroll to bottom when new hints arrive
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.hints.length, session.loadingHint, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canStart && isSetup) session.startSession();
  };

  const completedCount = session.hints.filter((h) => h.submitted).length;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Progress bar (only after session starts) */}
      {!isSetup && (
        <div className="border-b border-border bg-card/60 px-6 py-3">
          <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wide">
                {status === "awaiting_final"
                  ? "Final answer"
                  : status === "evaluating"
                    ? "Reviewing your answer"
                    : status === "completed"
                      ? "Session complete"
                      : `Hint ${Math.min(session.currentIndex + 1, session.totalHints)} of ${session.totalHints}`}
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

      {/* Scrollable chat column */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "mx-auto flex w-full max-w-2xl flex-col px-6",
            isSetup ? "min-h-full justify-center py-12" : "py-8",
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

              {session.hints.map((h, idx) => (
                <HintActionBox
                  key={h.id}
                  index={idx}
                  total={session.totalHints}
                  entry={h}
                  isCurrent={idx === session.currentIndex && status === "active_hint"}
                  loadingNext={session.loadingHint}
                  onSelect={(i) => session.selectChoice(h.id, i)}
                  onReason={(t) => session.setReasoning(h.id, t)}
                  onSubmit={() => session.submitChoice(h.id)}
                  onContinue={session.continueNext}
                />
              ))}

              {session.loadingHint && (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting the next hint...
                </div>
              )}

              {(status === "awaiting_final" || status === "evaluating" || status === "completed") && (
                <FinalAnswerBox session={session} />
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
