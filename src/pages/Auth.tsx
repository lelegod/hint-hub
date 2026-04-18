import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup" | "forgot_email" | "forgot_code" | "forgot_new_password";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Recovery flow state
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome! Your account is ready.");
        navigate("/");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        navigate("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send recovery code to email
  const sendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim());
      if (error) throw error;
      toast.success("Check your email for a 6-digit code.");
      setMode("forgot_code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send recovery email");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the OTP
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: recoveryEmail.trim(),
        token: code,
        type: "recovery",
      });
      if (error) throw error;
      toast.success("Code verified. Set your new password.");
      setMode("forgot_new_password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set the new password (user is now in a recovery session)
  const setNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      // Reset recovery state
      setRecoveryEmail("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  const headerTitle =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
      ? "Create your account"
      : mode === "forgot_email"
      ? "Reset your password"
      : mode === "forgot_code"
      ? "Enter your code"
      : "Set a new password";

  const headerSub =
    mode === "forgot_email"
      ? "Enter the email on your account and we'll send you a 6-digit code."
      : mode === "forgot_code"
      ? `We sent a code to ${recoveryEmail}. Check your inbox.`
      : mode === "forgot_new_password"
      ? "Pick a strong password — at least 6 characters."
      : "Track XP, streaks, and your skill tree.";

  const goBackToSignin = () => {
    setMode("signin");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-warm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elevated">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl text-foreground">{headerTitle}</h1>
          <p className="text-sm text-muted-foreground">{headerSub}</p>
        </div>

        {(mode === "signin" || mode === "signup") && (
          <>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryEmail(email);
                        setMode("forgot_email");
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>No account? <button type="button" onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">Sign up</button></>
              ) : (
                <>Have an account? <button type="button" onClick={() => setMode("signin")} className="font-medium text-primary hover:underline">Sign in</button></>
              )}
            </div>
          </>
        )}

        {mode === "forgot_email" && (
          <form onSubmit={sendRecoveryCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="recovery-email">Email</Label>
              <Input
                id="recovery-email"
                type="email"
                required
                autoFocus
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send 6-digit code"}
            </Button>
            <button
              type="button"
              onClick={goBackToSignin}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </form>
        )}

        {mode === "forgot_code" && (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="otp" className="self-start">Verification code</Label>
              <InputOTP
                id="otp"
                maxLength={6}
                value={code}
                onChange={setCode}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
              {loading ? "Verifying..." : "Verify code"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setMode("forgot_email")}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change email
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => sendRecoveryCode({ preventDefault: () => {} } as React.FormEvent)}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {mode === "forgot_new_password" && (
          <form onSubmit={setNewPasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Update password"}
            </Button>
          </form>
        )}

        <div className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Back to tutor</Link>
        </div>
      </div>
    </div>
  );
}
