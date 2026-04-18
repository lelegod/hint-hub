import { Brain, Coins, Flame, Snowflake, Sparkles, Trophy, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useGamification } from "@/hooks/useGamification";
import { levelFromXp } from "@/lib/gamification/constants";
import { isMuted, setMuted } from "@/lib/sound";

export function StatHud() {
  const { state, authed } = useGamification();
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  if (!authed) {
    return (
      <div className="flex items-center justify-end gap-2 border-b border-border/60 bg-card/40 px-4 py-2 text-xs">
        <Link
          to="/auth"
          className="rounded-full bg-primary px-3 py-1 text-primary-foreground hover:bg-primary/90"
        >
          Sign in to track progress
        </Link>
      </div>
    );
  }

  if (!state) {
    return <div className="h-10 border-b border-border/60 bg-card/40" />;
  }

  const { level, intoLevel, needed, pct } = levelFromXp(state.xp);
  const heatPct = Math.min(100, state.brain_heat);
  const hot = heatPct >= 70;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 bg-card/40 px-4 py-2 text-xs">
      {/* Level + XP */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex min-w-[140px] items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground shadow-soft">
              {level}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">Level</span>
                <span>{intoLevel}/{needed}</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>{state.xp} XP total</TooltipContent>
      </Tooltip>

      {/* Streak */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
            <Flame className={cn("h-3.5 w-3.5", state.streak_days > 0 ? "text-accent" : "text-muted-foreground")} />
            <span className="font-semibold text-foreground">{state.streak_days}</span>
            <span className="text-muted-foreground">day{state.streak_days === 1 ? "" : "s"}</span>
            {state.streak_freezes > 0 && (
              <span className="ml-1 flex items-center gap-0.5 text-[10px] text-primary">
                <Snowflake className="h-3 w-3" />
                {state.streak_freezes}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Current streak{state.streak_freezes > 0 ? ` · ${state.streak_freezes} freeze${state.streak_freezes === 1 ? "" : "s"}` : ""}
        </TooltipContent>
      </Tooltip>

      {/* Hint tokens removed — hints are unlimited */}

      {/* Brain heat */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex min-w-[120px] flex-1 items-center gap-2 sm:flex-initial">
            <Brain
              className={cn(
                "h-3.5 w-3.5 transition-all",
                hot ? "animate-pulse text-accent" : "text-muted-foreground",
              )}
            />
            <div className="flex-1">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                    hot
                      ? "bg-gradient-to-r from-warning via-accent to-destructive"
                      : "bg-gradient-to-r from-primary/40 to-primary",
                  )}
                  style={{ width: `${heatPct}%` }}
                />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>Brain heat: {Math.round(heatPct)}%</TooltipContent>
      </Tooltip>

      <div className="ml-auto flex items-center gap-1">
        <Link
          to="/skills"
          className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-foreground hover:border-primary/40"
          aria-label="Open skill tree"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Skills</span>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{muted ? "Sound off" : "Sound on"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 sm:flex">
              <Trophy className="h-3.5 w-3.5 text-warning" />
              <span className="font-semibold text-foreground">{state.total_hints_solved}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Hints solved (lifetime)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
