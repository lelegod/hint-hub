import { FileText, ImageIcon } from "lucide-react";
import type { UploadedFileMeta } from "@/lib/tutor/types";

interface Props {
  file: UploadedFileMeta | null;
  problemSummary: string;
}

export function ProblemPanel({ file, problemSummary }: Props) {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="border-b border-border bg-card/60 px-5 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          The problem
        </div>
        <div className="mt-1 line-clamp-2 text-sm text-foreground">{problemSummary || "No description provided."}</div>
      </div>
      <div className="flex-1 overflow-hidden">
        {file ? (
          file.mime.startsWith("image/") ? (
            <div className="h-full overflow-auto p-4">
              <img src={file.url} alt={file.name} className="mx-auto max-w-full rounded-md shadow-soft" />
            </div>
          ) : file.mime === "application/pdf" ? (
            <iframe src={file.url} title={file.name} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
              <FileText className="h-10 w-10" />
              <div className="text-sm">{file.name}</div>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline underline-offset-2"
              >
                Open file
              </a>
            </div>
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <div className="text-sm">No problem file uploaded</div>
          </div>
        )}
      </div>
    </div>
  );
}
