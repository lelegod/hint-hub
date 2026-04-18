import { useState } from "react";
import { ArrowRight, BookMarked, CheckCircle2, Lightbulb, Loader2, MessageSquareQuote, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { HintEntry } from "@/lib/tutor/types";
import { RichText } from "./RichText";

interface Props {
  index: number;
  total: number;
  entry: HintEntry;
  isCurrent: boolean;
  loadingNext: boolean;
  onSelect: (idx: number) => void;
  onReason: (text: string) => void;
  onSubmit: () => void;
  onContinue: () => void;
}

export function HintActionBox({
  index,
  total,
  entry,
  isCurrent,
  loadingNext,
  onSelect,
  onReason,
  onSubmit,
  onContinue,
}: Props) {
  const [showReasoning, setShowReasoning] = useState(entry.selectedIndex !== null);

  const c = entry.challenge;
  const correctIdx = c.correctIndex;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border shadow-soft transition-all animate-fade-in",
        entry.submitted
          ? entry.wasCorrect
            ? "border-success/50"
            : "border-accent/50"
          : isCurrent
            ? "border-primary/40"
            : "border-border opacity-90",
      )}
    >
      <div className="border-b border-border bg-primary-soft/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Lightbulb className="h-4 w-4" />
            Hint {index + 1} of {total}
          </div>
          {entry.submitted && (
            <div
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                entry.wasCorrect ? "bg-success/15 text-success" : "bg-accent/15 text-accent",
              )}
            >
              {entry.wasCorrect ? "Got it" : "Keep going"}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <RichText className="text-sm">{c.hint}</RichText>

        {c.sourceReference && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <BookMarked className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{c.sourceReference}</span>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quick check
          </div>
          <div className="rounded-md border border-border bg-background p-3 text-sm text-foreground">
            <RichText className="text-sm">{c.microChallenge}</RichText>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {c.choices.map((choice, i) => {
              const selected = entry.selectedIndex === i;
              const reveal = entry.submitted;
              const isCorrect = reveal && i === correctIdx;
              const isWrongPick = reveal && selected && i !== correctIdx;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={entry.submitted || !isCurrent}
                  onClick={() => {
                    onSelect(i);
                    setShowReasoning(true);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition-all",
                    "disabled:cursor-not-allowed",
                    !reveal && selected && "border-primary bg-primary-soft text-foreground",
                    !reveal && !selected && "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                    isCorrect && "border-success bg-success-soft text-success-foreground/90",
                    isWrongPick && "border-accent bg-accent-soft text-accent-foreground/90",
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {choice}
                </button>
              );
            })}
          </div>
        </div>

        {showReasoning && entry.selectedIndex !== null && !entry.submitted && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Explain your reasoning for choosing this answer
            </label>
            <Textarea
              value={entry.reasoning}
              onChange={(e) => onReason(e.target.value)}
              placeholder="In a sentence or two, walk us through your thinking."
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={onSubmit} disabled={!entry.reasoning.trim()}>
                Submit answer
              </Button>
            </div>
          </div>
        )}

        {entry.submitted && (
          <div
            className={cn(
              "rounded-md border p-4 animate-fade-in",
              entry.wasCorrect
                ? "border-success/40 bg-success-soft"
                : "border-accent/40 bg-accent-soft",
            )}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {entry.wasCorrect ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-accent" />
              )}
              {entry.wasCorrect ? "Nicely reasoned" : "Not quite, but here is why"}
            </div>
            <RichText className="text-sm">{c.correctExplanation}</RichText>
            {isCurrent && (
              <div className="mt-4 flex justify-end">
                <Button onClick={onContinue} disabled={loadingNext} className="gap-2">
                  {loadingNext ? "Loading..." : index + 1 >= total ? "Move to final answer" : "Continue to next hint"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
