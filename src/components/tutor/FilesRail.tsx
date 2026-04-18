import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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

export function FilesRail({ session }: Props) {
  const [filesOpen, setFilesOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
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
          <span className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
            <span className="font-serif text-base">Files</span>
          </span>
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
                  onChange={(e) =>
                    session.setTotalHints(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                  }
                  className="h-9"
                  disabled={session.status !== "setup"}
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
  );
}

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
