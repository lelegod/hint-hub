import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

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
      } else {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-warm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elevated">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Track XP, streaks, and your skill tree.
          </p>
        </div>

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
            <Label htmlFor="password">Password</Label>
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

        <div className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Back to tutor</Link>
        </div>
      </div>
    </div>
  );
}
