import { useState } from "react";
import { BookOpen, CheckCircle2, HelpCircle, Loader2, Send, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TutorSession } from "@/hooks/useTutorSession";
import { RichText } from "./RichText";

interface Props {
  session: TutorSession;
}

const FINAL_MCQ_OPTIONS = ["Paper 1", "Paper 2", "Paper 3", "Paper 4"];
const FINAL_MCQ_CORRECT = 3; // Paper 4 (index 3)

export function FinalAnswerBox({ session }: Props) {
  const { finalAnswer, setFinalAnswer, submitFinal, status, finalEval, requestExtraHint, startConnectionGame, problemSummary, fullExtractedProblemText } = session;
  const originalProblem = fullExtractedProblemText?.trim() || problemSummary?.trim() || "";

  const [mcqChoice, setMcqChoice] = useState<number | null>(null);
  const mcqAnswered = mcqChoice !== null;
  const mcqCorrect = mcqChoice === FINAL_MCQ_CORRECT;

  if (status === "completed" && finalEval?.correct) {
    return (
      <Card className="border-success/50 bg-success-soft p-6 shadow-elevated animate-pop-in">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-success" />
          <div className="flex-1">
            <h3 className="font-serif text-2xl text-foreground">You mastered it</h3>
            <div className="mt-2"><RichText className="text-sm">{finalEval.feedback}</RichText></div>
            <Button onClick={startConnectionGame} className="mt-5 gap-2" size="lg">
              Play the connection game
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 p-5 shadow-soft animate-fade-in">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <Send className="h-4 w-4" />
        Your final solution
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Now bring it together. Submit your final answer and your working.
      </p>

      {originalProblem && (
        <div className="mb-5 overflow-hidden rounded-md border border-border bg-muted/40">
          <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Original problem
          </div>
          <div className="space-y-4 p-5">
            <RichText className="text-sm leading-relaxed">{originalProblem}</RichText>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-md border border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-start gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
          Based on your calculations, which paper is the most central?
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FINAL_MCQ_OPTIONS.map((opt, idx) => {
            const isSelected = mcqChoice === idx;
            const showState = mcqAnswered && isSelected;
            return (
              <Button
                key={opt}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setMcqChoice(idx)}
                className={cn(
                  "justify-center",
                  showState && mcqCorrect && "bg-success text-success-foreground hover:bg-success/90",
                  showState && !mcqCorrect && "bg-accent text-accent-foreground hover:bg-accent/90",
                )}
              >
                {opt}
              </Button>
            );
          })}
        </div>
        {mcqAnswered && !mcqCorrect && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-accent/40 bg-accent-soft p-3 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 text-accent" />
            <span>Not quite — check your 4th iteration calculation again, then write your reasoning below.</span>
          </div>
        )}
        {mcqAnswered && mcqCorrect && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-success/40 bg-success-soft p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
            <span>Nice — now explain your full reasoning below.</span>
          </div>
        )}
      </div>

      {mcqAnswered && (
        <div className="animate-fade-in">
          <Textarea
            value={finalAnswer}
            onChange={(e) => setFinalAnswer(e.target.value)}
            rows={6}
            placeholder="Type your full solution here, including each step of your reasoning."
            disabled={status === "evaluating"}
          />

          {finalEval && !finalEval.correct && (
            <div className="mt-4 rounded-md border border-accent/40 bg-accent-soft p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <XCircle className="h-4 w-4 text-accent" />
                Almost there
              </div>
              <RichText className="text-sm">{finalEval.feedback}</RichText>
              {finalEval.whereWentWrong && (
                <div className="mt-2"><RichText className="text-sm">{finalEval.whereWentWrong}</RichText></div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">A new hint has been added to your timeline above.</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={requestExtraHint} disabled={status === "evaluating"} className="gap-2">
              <HelpCircle className="h-4 w-4" />
              I am still stuck, give me another hint
            </Button>
            <Button onClick={submitFinal} disabled={!finalAnswer.trim() || status === "evaluating"} className="gap-2">
              {status === "evaluating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit final answer
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
