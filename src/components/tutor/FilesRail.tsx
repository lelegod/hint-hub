import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileDropzone } from "./FileDropzone";
import type { TutorSession } from "@/hooks/useTutorSession";

interface Props {
  session: TutorSession;
}

export function FilesRail({ session }: Props) {
  const isMobile = useIsMobile();
  // Collapsed by default on mobile and tablet so the chat has more room.
  // Mobile: hidden entirely until the user pops it open.
  const [filesOpen, setFilesOpen] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Reset visibility when crossing the mobile breakpoint
  useEffect(() => {
    if (!isMobile) setMobileVisible(true);
    else setMobileVisible(false);
  }, [isMobile]);

  // On mobile, when fully hidden, show a tiny floating toggle so the user can pop it in.
  // Single tap opens the panel directly (no second tap to expand).
  if (isMobile && !mobileVisible) {
    return (
      <button
        type="button"
        onClick={() => {
          setMobileVisible(true);
          setFilesOpen(true);
        }}
        className="fixed right-0 top-1/2 z-30 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground"
        aria-label="Open files panel"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
    );
  }

  // Width tiers:
  // - tablet/mobile collapsed: w-10 (super thin)
  // - desktop collapsed:       w-12
  // - expanded:                w-64 (slightly thinner than before)
  const widthClass = filesOpen ? "w-64 lg:w-72" : "w-10 md:w-12";

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-l border-border bg-card/40 transition-all duration-300",
        widthClass,
      )}
    >
      {!filesOpen ? (
        <button
          type="button"
          onClick={() => setFilesOpen(true)}
          aria-label="Expand files panel"
          className="absolute right-full top-1/2 z-20 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (isMobile) {
              setFilesOpen(false);
              setMobileVisible(false);
              return;
            }
            setFilesOpen(false);
          }}
          className="flex items-center justify-between gap-2 px-3 py-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          aria-label="Collapse files panel"
        >
          <span className="font-serif text-base">Files</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

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
  return <FileDropzone {...props} />;
}
