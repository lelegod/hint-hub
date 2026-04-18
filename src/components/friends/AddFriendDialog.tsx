import { useState } from "react";
import { Check, Copy, Loader2, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFriends } from "@/hooks/useFriends";

interface Props {
  trigger?: React.ReactNode;
}

export function AddFriendDialog({ trigger }: Props) {
  const { sendRequestByEmail } = useFriends();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // After invite_created, we show the shareable link
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail("");
    setInviteLink(null);
    setInvitedEmail(null);
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const result = await sendRequestByEmail(email.trim());
      if (result.status === "request_sent") {
        toast.success("Friend request sent.");
        handleOpenChange(false);
      } else if (result.status === "already_friends") {
        toast.info("You're already friends.");
        handleOpenChange(false);
      } else if (result.status === "already_pending") {
        toast.info("A request is already pending.");
        handleOpenChange(false);
      } else if (result.status === "invite_created") {
        const link = `${window.location.origin}/auth?invite=${result.token}&email=${encodeURIComponent(result.email)}`;
        setInviteLink(link);
        setInvitedEmail(result.email);
      } else {
        toast.error(result.message || "Could not send request");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied.");
    setTimeout(() => setCopied(false), 2000);
  };

  const mailtoUrl = inviteLink && invitedEmail
    ? `mailto:${invitedEmail}?subject=${encodeURIComponent("Join me on Tutorly")}&body=${encodeURIComponent(
        `Hey,\n\nI'm using Tutorly to learn step-by-step. Join me here and we'll be friends automatically:\n\n${inviteLink}\n\nSee you there!`,
      )}`
    : "#";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" /> Add friend
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a friend</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? "They aren't on Tutorly yet. Send them this invite — once they sign up you'll be friends automatically."
              : "Enter their email. If they're on Tutorly, they'll get an in-app request."}
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={submit} className="space-y-4">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Send request
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
              <Input
                readOnly
                value={inviteLink}
                className="border-0 bg-transparent text-xs focus-visible:ring-0"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button size="icon" variant="ghost" onClick={copyLink} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1 gap-2">
                <a href={mailtoUrl}>
                  <Mail className="h-4 w-4" /> Open email
                </a>
              </Button>
              <Button onClick={() => handleOpenChange(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
