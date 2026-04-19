import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/tutor/AppSidebar";
import { ChatThread } from "@/components/tutor/ChatThread";
import { ConnectionGame } from "@/components/tutor/ConnectionGame";
import { MatchGame } from "@/components/tutor/MatchGame";
import { FilesRail } from "@/components/tutor/FilesRail";
import { useTutorSession } from "@/hooks/useTutorSession";

const Index = () => {
  const session = useTutorSession();
  const { status } = session;

  return (
    <div className="flex h-screen w-full bg-gradient-warm">
      <AppSidebar
        history={session.history}
        friends={session.friends}
        onNewSession={session.resetSession}
        onOpenSession={session.loadSession}
        onStartMatchGame={session.startMatchGame}
        onStartConnectionGame={session.startConnectionGame}
      />

      <main className="flex h-full flex-1 overflow-hidden">
        {status === "connection_game" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-10">
              {session.connection ? (
                <ConnectionGame
                  groups={session.connection.groups}
                  onRestart={session.closeConnectionGame}
                />
              ) : (
                <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Building your concept grid...
                </div>
              )}
            </div>
          </div>
        ) : status === "match_game" ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-10">
              {session.match ? (
                <MatchGame
                  pairs={session.match.pairs}
                  onRestart={session.closeMatchGame}
                  onPlayAgain={session.startMatchGame}
                />
              ) : (
                <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" /> Building your match game...
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-full flex-1 flex-col overflow-hidden">
              <ChatThread session={session} />
            </div>
            <FilesRail session={session} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
