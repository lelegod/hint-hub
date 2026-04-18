import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AppSidebar } from "@/components/tutor/AppSidebar";
import { ConnectionGame } from "@/components/tutor/ConnectionGame";
import { FinalAnswerBox } from "@/components/tutor/FinalAnswerBox";
import { HintActionBox } from "@/components/tutor/HintActionBox";
import { ProblemPanel } from "@/components/tutor/ProblemPanel";
import { SetupScreen } from "@/components/tutor/SetupScreen";
import { useTutorSession } from "@/hooks/useTutorSession";

const Index = () => {
  const session = useTutorSession();
  const { status } = session;

  return (
    <div className="flex h-screen w-full bg-gradient-warm">
      <AppSidebar history={session.history} friends={session.friends} onNewSession={session.resetSession} />

      <main className="flex h-full flex-1 flex-col overflow-hidden">
        {status === "setup" ? (
          <div className="flex-1 overflow-y-auto">
            <SetupScreen session={session} />
          </div>
        ) : status === "connection_game" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-10">
              {session.connection ? (
                <ConnectionGame groups={session.connection.groups} onRestart={session.resetSession} />
              ) : (
                <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Building your concept grid...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="hidden h-full overflow-hidden border-r border-border lg:block">
              <ProblemPanel file={session.files.problemPdf} problemSummary={session.problemSummary} />
            </div>

            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-border bg-card/60 px-6 py-3">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide">
                    {status === "awaiting_final"
                      ? "Final answer"
                      : status === "evaluating"
                        ? "Reviewing your answer"
                        : `Hint ${Math.min(session.currentIndex + 1, session.totalHints)} of ${session.totalHints}`}
                  </span>
                  <span>
                    {session.hints.filter((h) => h.submitted).length} / {session.totalHints} completed
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (session.hints.filter((h) => h.submitted).length / session.totalHints) * 100)}
                  className="h-1.5"
                />
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-2xl space-y-5">
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
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Drafting the next hint...
                    </div>
                  )}

                  {(status === "awaiting_final" || status === "evaluating" || status === "completed") && (
                    <FinalAnswerBox session={session} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
