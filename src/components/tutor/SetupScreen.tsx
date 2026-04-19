import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FileDropzone } from "./FileDropzone";
import type { TutorSession } from "@/hooks/useTutorSession";

interface Props {
  session: TutorSession;
}

export function SetupScreen({ session }: Props) {
  const [filesOpen, setFilesOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const canStart = session.problemSummary.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canStart) session.startSession();
  };

  return (
    <div className="relative flex h-full w-full animate-fade-in">
      {/* Center: greeting + input, lots of breathing room */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <h1 className="text-center font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Welcome!
            <br />
            <span className="text-muted-foreground"> How can I support your learning today?</span>
          </h1>

          <form onSubmit={handleSubmit} className="mt-12">
            <div
              className={cn(
                "group relative flex items-center rounded-full border border-border bg-card pl-6 pr-2 shadow-soft transition-all",
                "focus-within:border-primary/60 focus-within:shadow-elevated",
              )}
            >
              <input
                type="text"
                placeholder="write here"
                value={session.problemSummary}
                onChange={(e) => session.setProblemSummary(e.target.value)}
                className="flex-1 bg-transparent py-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                disabled={!canStart}
                className="h-10 w-10 shrink-0 rounded-full"
                aria-label="Start learning"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {session.errorMsg && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive">
                {session.errorMsg}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Right rail: Files + more (collapsible) */}
      <aside
        className={cn(
          "relative flex h-full shrink-0 flex-col border-l border-border bg-card/40 transition-all duration-300",
          filesOpen ? "w-72" : "w-12",
        )}
      >
        <button
          type="button"
          onClick={() => setFilesOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 px-3 py-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40",
            filesOpen ? "justify-between" : "justify-center",
          )}
          aria-label={filesOpen ? "Collapse files panel" : "Expand files panel"}
        >
          {filesOpen ? (
            <>
              <span className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
                <span className="font-serif text-base">Files</span>
              </span>
            </>
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {filesOpen && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4">
            <CompactDropzone
              label="Problem"
              hint="PDF or image"
              accept="application/pdf,image/*"
              fileKey="problemPdf"
              current={session.files.problemPdf}
              onUpload={session.uploadFile}
            />
            <CompactDropzone
              label="Source material"
              hint="Notes, chapter"
              accept="application/pdf,text/*,image/*"
              fileKey="sourceMaterial"
              current={session.files.sourceMaterial}
              onUpload={session.uploadFile}
            />
            <CompactDropzone
              label="Extra context"
              hint="Optional"
              accept="application/pdf,text/*,image/*"
              fileKey="extraFile"
              current={session.files.extraFile}
              onUpload={session.uploadFile}
            />

            <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="mx-auto block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {moreOpen ? "less" : "more"}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hints" className="text-xs text-muted-foreground">
                    Hints to plan
                  </Label>
                  <Input
                    id="hints"
                    type="number"
                    min={1}
                    max={10}
                    value={session.totalHints}
                    onChange={(e) => session.setTotalHints(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="source-summary" className="text-xs text-muted-foreground">
                    Source material context
                  </Label>
                  <Textarea
                    id="source-summary"
                    placeholder="e.g. Chapter 4 on factoring."
                    value={session.sourceSummary}
                    onChange={(e) => session.setSourceSummary(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="extra-summary" className="text-xs text-muted-foreground">
                    Extra problem context
                  </Label>
                  <Textarea
                    id="extra-summary"
                    placeholder="Anything else to know."
                    value={session.extraSummary}
                    onChange={(e) => session.setExtraSummary(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </aside>
    </div>
  );
}

/* Compact, sketch-inspired dropzone tile */
function CompactDropzone(props: React.ComponentProps<typeof FileDropzone>) {
  const { current } = props;
  return (
    <div className="relative">
      <FileDropzone {...props} />
      {!current && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Plus className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}
