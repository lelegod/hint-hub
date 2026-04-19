import { Link } from "react-router-dom";
import { ArrowLeft, Sprout } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function Skills() {
  const { skillNodes, authed } = useGamification();

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-warm">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="mb-3 text-foreground">Sign in to grow your skill tree.</p>
          <Link to="/auth" className="font-medium text-primary hover:underline">Go to sign in</Link>
        </div>
      </div>
    );
  }

  // Group by parent topic, fall back to "General"
  const grouped = skillNodes.reduce<Record<string, typeof skillNodes>>((acc, n) => {
    const key = n.parent_topic ?? "General";
    (acc[key] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-warm px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to tutor
        </Link>
        <h1 className="mb-1 font-serif text-3xl text-foreground">Your skill tree</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Each topic you study sprouts a new branch. Keep practicing to grow mastery.
        </p>

        {skillNodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <Sprout className="mx-auto mb-2 h-8 w-8 text-primary/60" />
            <div className="font-serif text-lg text-foreground">Nothing planted yet</div>
            <div className="text-sm text-muted-foreground">
              Start a tutoring session — your first topic will appear here.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([branch, nodes]) => (
              <div key={branch} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-lg text-foreground">{branch}</h2>
                  <span className="text-xs text-muted-foreground">({nodes.length})</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {nodes.map((n) => {
                    const isStrong = n.mastery >= 60;
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "rounded-xl border p-3 transition-colors",
                          n.mastery >= 80
                            ? "border-success/40 bg-success-soft"
                            : n.mastery >= 40
                              ? "border-primary/30 bg-primary-soft/40"
                              : "border-border bg-background",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{n.topic}</span>
                          <span className="text-xs text-muted-foreground">{n.mastery}%</span>
                        </div>
                        <Progress value={n.mastery} className="mt-2 h-1.5" />
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            Practiced {n.times_practiced}×
                          </span>
                          {/* Warm grey "partial" / "strong" tag */}
                          <span className="text-[11px] font-medium" style={{ color: "hsl(30 12% 55%)" }}>
                            {isStrong ? "strong skill" : "partial skill"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
