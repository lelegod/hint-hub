import { BookOpen, CheckCircle2, HelpCircle, Loader2, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { TutorSession } from "@/hooks/useTutorSession";
import { RichText } from "./RichText";

interface Props {
  session: TutorSession;
}

export function FinalAnswerBox({ session }: Props) {
  const { finalAnswer, setFinalAnswer, submitFinal, status, finalEval, requestExtraHint, startConnectionGame, problemSummary, fullExtractedProblemText } = session;
  const originalProblem = fullExtractedProblemText?.trim() || problemSummary?.trim() || "";

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
        <div className="mb-4 rounded-md border border-border bg-muted/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Original problem
          </div>
          <div className="max-h-48 overflow-y-auto pr-2">
            <RichText className="whitespace-pre-wrap text-sm text-foreground">{originalProblem}</RichText>
          </div>
        </div>
      )}

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
    </Card>
  );
}
