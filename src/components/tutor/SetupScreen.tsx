import { BookOpen, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileDropzone } from "./FileDropzone";
import type { TutorSession } from "@/hooks/useTutorSession";

interface Props {
  session: TutorSession;
}

export function SetupScreen({ session }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in px-6 py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
          Let's break this problem down
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
          Upload your assignment and any source material. Tutorly will guide you step by step
          without giving away the answer.
        </p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Set up your learning session
          </CardTitle>
          <CardDescription>
            Drop your files in the boxes below. We will use your source material to ground every hint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FileDropzone
              label="Problem"
              hint="PDF or image"
              required
              accept="application/pdf,image/*"
              fileKey="problemPdf"
              current={session.files.problemPdf}
              onUpload={session.uploadFile}
            />
            <FileDropzone
              label="Source material"
              hint="Notes, chapter, syllabus"
              accept="application/pdf,text/*,image/*"
              fileKey="sourceMaterial"
              current={session.files.sourceMaterial}
              onUpload={session.uploadFile}
            />
            <FileDropzone
              label="Extra material"
              hint="Optional context"
              accept="application/pdf,text/*,image/*"
              fileKey="extraFile"
              current={session.files.extraFile}
              onUpload={session.uploadFile}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="problem-summary">
                Briefly describe the problem <span className="text-accent">*</span>
              </Label>
              <Textarea
                id="problem-summary"
                placeholder="Example: Solve the quadratic equation 2x^2 + 5x - 3 = 0 by factoring."
                value={session.problemSummary}
                onChange={(e) => session.setProblemSummary(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-summary">Source material context (optional)</Label>
              <Textarea
                id="source-summary"
                placeholder="Example: Chapter 4 of our algebra textbook on factoring quadratics."
                value={session.sourceSummary}
                onChange={(e) => session.setSourceSummary(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label htmlFor="hints">How many hints should we plan for?</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="hints"
                  type="number"
                  min={1}
                  max={10}
                  value={session.totalHints}
                  onChange={(e) => session.setTotalHints(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">recommended: 3 to 5</span>
              </div>
            </div>
            <Button
              size="lg"
              onClick={session.startSession}
              disabled={!session.problemSummary.trim()}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Start learning session
            </Button>
          </div>

          {session.errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {session.errorMsg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
