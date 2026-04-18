import { useCallback, useState } from "react";
import { Upload, FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedFileMeta, UploadedFiles } from "@/lib/tutor/types";

interface Props {
  label: string;
  hint: string;
  required?: boolean;
  accept: string;
  fileKey: keyof UploadedFiles;
  current: UploadedFileMeta | null;
  onUpload: (key: keyof UploadedFiles, file: File) => Promise<UploadedFileMeta>;
}

export function FileDropzone({ label, hint, required, accept, fileKey, current, onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        await onUpload(fileKey, file);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [fileKey, onUpload],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handle(f);
      }}
      className={cn(
        "group relative flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-4 text-center transition-all",
        dragOver ? "border-primary bg-primary-soft" : "border-border hover:border-primary/60 hover:bg-muted/40",
        current && "border-success bg-success-soft",
      )}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />
      {busy ? (
        <Loader2 className="mb-2 h-7 w-7 animate-spin text-primary" />
      ) : current ? (
        <Check className="mb-2 h-7 w-7 text-success" />
      ) : (
        <Upload className="mb-2 h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
      )}
      <div className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </div>
      {current ? (
        <div className="mt-1 flex items-center gap-1 text-xs text-success">
          <FileText className="h-3 w-3" />
          <span className="max-w-[180px] truncate">{current.name}</span>
        </div>
      ) : (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
      {current && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 h-7 px-2 text-xs"
          onClick={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.parentElement as HTMLLabelElement).querySelector("input");
            input?.click();
          }}
        >
          Replace
        </Button>
      )}
    </label>
  );
}
