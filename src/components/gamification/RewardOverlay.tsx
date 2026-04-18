import { useEffect } from "react";
import { useGamification } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

export function RewardOverlay() {
  const { rewards, consumeReward } = useGamification();
  const current = rewards[0];

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => consumeReward(current.id), 2400);
    return () => clearTimeout(t);
  }, [current, consumeReward]);

  if (!current) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center pt-24">
      <button
        type="button"
        onClick={() => consumeReward(current.id)}
        className="pointer-events-auto group relative flex flex-col items-center"
        aria-label="Dismiss reward"
      >
        {/* Ring burst */}
        <div className="absolute inset-0 -m-8 animate-ping rounded-full border-2 border-primary/40" />
        <div
          className={cn(
            "relative flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card px-8 py-5 shadow-elevated",
            "animate-pop-in",
          )}
        >
          <div className="text-4xl">{current.emoji ?? "🎉"}</div>
          <div className="font-serif text-xl text-foreground">{current.title}</div>
          {current.subtitle && (
            <div className="text-sm text-muted-foreground">{current.subtitle}</div>
          )}
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            tap to dismiss
          </div>
        </div>
      </button>
    </div>
  );
}
