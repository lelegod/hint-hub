import { useState } from "react";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
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
  const [moreOpen, setMoreOpen] = useState(false);

  const canStart = session.problemSummary.trim().length > 0;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl animate-fade-in gap-8 px-6 py-12 lg:px-10">
      {/* Main column: question */}
      <div className="flex flex-1 flex-col">
        <div className="mb-8">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
            What do you need help with?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Type your question and we'll guide you to the answer one step at a time.
          </p>
        </div>

        <div className="flex flex-1 flex-col">
          <Textarea
            id="problem-summary"
            placeholder="Example: Solve the quadratic equation 2x² + 5x − 3 = 0 by factoring."
            value={session.problemSummary}
            onChange={(e) => session.setProblemSummary(e.target.value)}
            className="min-h-[180px] resize-none rounded-xl border-border bg-card p-5 text-base shadow-soft focus-visible:ring-primary"
          />

          <div className="mt-4 flex items-center justify-end">
            <Button
              size="lg"
              onClick={session.startSession}
              disabled={!canStart}
              className="gap-2"
            >
              Start learning
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {session.errorMsg && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {session.errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* Right rail: minimal setup */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-12 space-y-4 rounded-xl border border-border bg-card/60 p-5 shadow-soft">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session setup
            </div>
            <div className="mt-1 font-serif text-lg text-foreground">Quick options</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hints" className="text-xs text-muted-foreground">
              Hints to plan
            </Label>
            <Input
              id="hints"
              type="number"
              min={1}
              max={10}
              value={session.totalHints}
              onChange={(e) =>
                session.setTotalHints(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
              }
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">Recommended: 3 to 5</p>
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40",
                )}
              >
                <span>More options</span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="problem-file" className="text-xs text-muted-foreground">
                  Attach problem (PDF/image)
                </Label>
                <FileDropzone
                  label="Problem"
                  hint="PDF or image"
                  accept="application/pdf,image/*"
                  fileKey="problemPdf"
                  current={session.files.problemPdf}
                  onUpload={session.uploadFile}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source-summary" className="text-xs text-muted-foreground">
                  Source material context
                </Label>
                <Textarea
                  id="source-summary"
                  placeholder="Example: Chapter 4 on factoring quadratics."
                  value={session.sourceSummary}
                  onChange={(e) => session.setSourceSummary(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <FileDropzone
                  label="Source file"
                  hint="Notes, chapter, syllabus"
                  accept="application/pdf,text/*,image/*"
                  fileKey="sourceMaterial"
                  current={session.files.sourceMaterial}
                  onUpload={session.uploadFile}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra-summary" className="text-xs text-muted-foreground">
                  Extra problem context
                </Label>
                <Textarea
                  id="extra-summary"
                  placeholder="Anything else we should know about this problem."
                  value={session.extraSummary}
                  onChange={(e) => session.setExtraSummary(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <FileDropzone
                  label="Extra file"
                  hint="Optional context"
                  accept="application/pdf,text/*,image/*"
                  fileKey="extraFile"
                  current={session.files.extraFile}
                  onUpload={session.uploadFile}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </aside>
    </div>
  );
}
