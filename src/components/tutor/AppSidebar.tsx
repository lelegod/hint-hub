import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  History as HistoryIcon,
  LogIn,
  LogOut,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGamification } from "@/hooks/useGamification";
import { useFriends, type FriendRow, type Presence } from "@/hooks/useFriends";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { AddFriendDialog } from "@/components/friends/AddFriendDialog";
import { StatusEditor } from "@/components/friends/StatusEditor";
import type { FriendUpdate, HistoryItem } from "@/lib/tutor/mockData";

interface Props {
  history: HistoryItem[];
  friends: FriendUpdate[];
  onNewSession: () => void;
}

type Tab = "history" | "friends";

export function AppSidebar({ history, friends, onNewSession }: Props) {
  const isMobile = useIsMobile();
  const { authed, state } = useGamification();
  const streakDays = state?.streak_days ?? 0;
  const friendsHook = useFriends();
  usePresence(authed);

  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<Tab>("history");

  useEffect(() => {
    setCollapsed(true);
  }, [isMobile]);

  const widthClass = collapsed ? "w-12 md:w-14" : "w-60 lg:w-56";
  const pendingCount = friendsHook.pending.length;

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        widthClass,
      )}
    >
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="group absolute left-full top-1/2 z-20 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-sidebar-border bg-sidebar/80 text-muted-foreground backdrop-blur transition-colors hover:bg-sidebar hover:text-sidebar-foreground"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {/* Header */}
      <div
        className={cn(
          "border-b border-sidebar-border",
          collapsed
            ? "flex flex-col items-center gap-1 px-2 py-3"
            : "flex items-center gap-2 px-3 py-3",
        )}
      >
        {collapsed && isMobile && (
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tutorly
          </div>
        )}

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>

        {!collapsed && (
          <>
            <div className="flex-1">
              <div className="font-serif text-lg leading-tight text-sidebar-foreground">Tutorly</div>
              <div className="text-xs text-muted-foreground">Step-by-step tutor</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Collapsed mini buttons */}
      {collapsed && (
        <div className="flex flex-col items-center gap-3 px-1 py-3">
          <Button
            onClick={onNewSession}
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="New session"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {authed && pendingCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setCollapsed(false);
                setTab("friends");
              }}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary-soft text-primary"
              aria-label={`${pendingCount} friend requests`}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {pendingCount}
              </span>
            </button>
          )}
          {authed && (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent"
              title={`${streakDays} day streak`}
            >
              <Flame className="h-4 w-4" />
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <>
          <div className="space-y-2 px-3 py-3">
            <Button onClick={onNewSession} className="w-full">New session</Button>
            {authed && (
              <div className="flex items-center justify-between gap-2">
                <AddFriendDialog
                  trigger={
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" /> Add friend
                    </Button>
                  }
                />
                <div className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-sm text-accent">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{streakDays}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="mx-3 grid grid-cols-2 rounded-md bg-sidebar-accent p-1 text-xs">
            <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<HistoryIcon className="h-3 w-3" />} label="History" />
            <TabButton
              active={tab === "friends"}
              onClick={() => setTab("friends")}
              icon={<Users className="h-3 w-3" />}
              label="Friends"
              badge={pendingCount > 0 ? pendingCount : undefined}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {tab === "history" && <HistoryList history={history} />}
            {tab === "friends" && (
              <div className="space-y-4">
                {authed && (
                  <StatusEditor
                    emoji={friendsHook.myStatus.status_emoji}
                    message={friendsHook.myStatus.status_message}
                    onSave={friendsHook.updateMyStatus}
                  />
                )}
                {friendsHook.pending.length > 0 && (
                  <div>
                    <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Requests
                    </div>
                    <RequestsList
                      requests={friendsHook.pending}
                      onAccept={friendsHook.acceptRequest}
                      onDecline={friendsHook.declineRequest}
                    />
                  </div>
                )}
                <FriendsList friends={friendsHook.friends} feed={friends} />
              </div>
            )}
          </div>

          {/* Auth row */}
          <div className="border-t border-sidebar-border px-3 py-3">
            {authed ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                <Link to="/auth"><LogIn className="h-4 w-4" /> Sign in to track XP</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-1 rounded px-1.5 py-1.5 transition-colors",
        active
          ? "bg-sidebar text-sidebar-foreground shadow-soft"
          : "text-muted-foreground hover:text-sidebar-foreground",
      )}
    >
      {icon} {label}
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function HistoryList({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-sidebar-border p-4 text-center text-xs text-muted-foreground">
        Your sessions will appear here as you start them.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {history.map((h) => {
        const active = h.status === "active";
        return (
          <li
            key={h.id}
            className={cn(
              "rounded-md border bg-sidebar p-3 text-sm transition-colors hover:border-primary/40",
              active ? "border-primary/40" : "border-sidebar-border",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="line-clamp-2 flex-1 font-medium text-sidebar-foreground">{h.title}</div>
              {active && (
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Active
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{h.hintsUsed} hints</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {h.completedAt}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function presenceColor(p: Presence) {
  if (p === "online") return "bg-emerald-500";
  if (p === "away") return "bg-amber-500";
  return "bg-muted-foreground/40";
}

function presenceLabel(p: Presence) {
  if (p === "online") return "Online";
  if (p === "away") return "Away";
  return "Offline";
}

function FriendsList({
  friends,
  feed,
}: {
  friends: FriendRow[];
  feed: FriendUpdate[];
}) {
  if (friends.length === 0 && feed.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-dashed border-sidebar-border p-4 text-center text-xs text-muted-foreground">
          No friends yet. Tap "Add friend" to invite someone.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {friends.length > 0 && (
        <div>
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your friends
          </div>
          <ul className="space-y-1.5">
            {friends.map((f) => {
              const subtitle = f.current_activity
                ? `Working on ${f.current_activity}`
                : f.status_message || presenceLabel(f.presence);
              return (
                <li
                  key={f.friend_user_id}
                  className="flex items-start gap-2 rounded-md border border-sidebar-border bg-sidebar p-2 text-sm"
                >
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                      {f.friend_name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar",
                        presenceColor(f.presence),
                      )}
                      title={presenceLabel(f.presence)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate text-sidebar-foreground">
                      <span className="truncate font-medium">{f.friend_name}</span>
                      {f.status_emoji && <span className="text-sm leading-none">{f.status_emoji}</span>}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {feed.length > 0 && (
        <div>
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent activity
          </div>
          <ul className="space-y-2">
            {feed.map((f) => (
              <li key={f.id} className="rounded-md border border-sidebar-border bg-sidebar p-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {f.name[0]?.toUpperCase() ?? "?"}
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
        </div>
      )}
    </div>
  );
}

function RequestsList({
  requests,
  onAccept,
  onDecline,
}: {
  requests: { friendship_id: string; requester_name: string; created_at: string }[];
  onAccept: (id: string) => Promise<boolean>;
  onDecline: (id: string) => Promise<boolean>;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-sidebar-border p-4 text-center text-xs text-muted-foreground">
        No pending friend requests.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li
          key={r.friendship_id}
          className="rounded-md border border-sidebar-border bg-sidebar p-3 text-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {r.requester_name[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 truncate">
              <div className="truncate font-medium text-sidebar-foreground">{r.requester_name}</div>
              <div className="text-xs text-muted-foreground">wants to be friends</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onAccept(r.friendship_id)}
            >
              <Check className="h-3.5 w-3.5" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => onDecline(r.friendship_id)}
            >
              <X className="h-3.5 w-3.5" /> Decline
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
