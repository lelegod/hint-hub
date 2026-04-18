import { useEffect, useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_EMOJIS = ["📚", "🧠", "☕", "🔥", "😴", "💡", "🎯", "🚀", "🤔", "✨"];

interface Props {
  emoji: string | null;
  message: string | null;
  onSave: (emoji: string, message: string) => Promise<boolean> | boolean;
}

export function StatusEditor({ emoji, message, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [draftEmoji, setDraftEmoji] = useState(emoji ?? "");
  const [draftMessage, setDraftMessage] = useState(message ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftEmoji(emoji ?? "");
      setDraftMessage(message ?? "");
    }
  }, [open, emoji, message]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(draftEmoji, draftMessage);
    setSaving(false);
    setOpen(false);
  };

  const handleClear = async () => {
    setSaving(true);
    await onSave("", "");
    setSaving(false);
    setOpen(false);
  };

  const display = emoji || message ? (
    <span className="flex items-center gap-1.5 truncate">
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      <span className="truncate">{message || "Set a status"}</span>
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Smile className="h-3.5 w-3.5" /> Set a status
    </span>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full truncate rounded-md border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-left text-xs text-sidebar-foreground transition-colors hover:border-primary/40"
        >
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your status
            </div>
            <div className="flex gap-2">
              <Input
                value={draftEmoji}
                onChange={(e) => setDraftEmoji(e.target.value.slice(0, 4))}
                placeholder="🧠"
                className="w-14 text-center text-base"
                maxLength={4}
              />
              <Input
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value.slice(0, 80))}
                placeholder="What's up?"
                maxLength={80}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick pick
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setDraftEmoji(e)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear} disabled={saving}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
