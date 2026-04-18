import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, History as HistoryIcon, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FriendUpdate, HistoryItem } from "@/lib/tutor/mockData";

interface Props {
  history: HistoryItem[];
  friends: FriendUpdate[];
  onNewSession: () => void;
}

export function AppSidebar({ history, friends, onNewSession }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<"history" | "friends">("history");

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-12" : "w-56",
      )}
    >
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex-1">
            <div className="font-serif text-lg leading-tight text-sidebar-foreground">Tutorly</div>
            <div className="text-xs text-muted-foreground">Step-by-step tutor</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="px-3 py-3">
            <Button onClick={onNewSession} className="w-full">New session</Button>
          </div>

          <div className="mx-3 grid grid-cols-2 rounded-md bg-sidebar-accent p-1 text-sm">
            <button
              onClick={() => setTab("history")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 transition-colors",
                tab === "history"
                  ? "bg-sidebar text-sidebar-foreground shadow-soft"
                  : "text-muted-foreground hover:text-sidebar-foreground",
              )}
            >
              <HistoryIcon className="h-3.5 w-3.5" /> History
            </button>
            <button
              onClick={() => setTab("friends")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 transition-colors",
                tab === "friends"
                  ? "bg-sidebar text-sidebar-foreground shadow-soft"
                  : "text-muted-foreground hover:text-sidebar-foreground",
              )}
            >
              <Users className="h-3.5 w-3.5" /> Friends
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {tab === "history" ? (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-md border border-sidebar-border bg-sidebar p-3 text-sm hover:border-primary/40"
                  >
                    <div className="line-clamp-2 font-medium text-sidebar-foreground">{h.title}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{h.hintsUsed} hints</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {h.completedAt}
                      </span>
                    </div>
                  </li>
                ))}
                {history.length === 0 && (
                  <div className="rounded-md border border-dashed border-sidebar-border p-4 text-center text-xs text-muted-foreground">
                    Your finished sessions will appear here.
                  </div>
                )}
              </ul>
            ) : (
              <ul className="space-y-2">
                {friends.map((f) => (
                  <li key={f.id} className="rounded-md border border-sidebar-border bg-sidebar p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {f.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sidebar-foreground">
                          <span className="font-semibold">{f.name}</span>{" "}
                          <span className="text-muted-foreground">{f.message}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{f.timeAgo}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
