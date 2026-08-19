import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Disclaimer } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MarginMap" },
      { name: "description", content: "Sign in to your MarginMap product intelligence workspace." },
      { property: "og:title", content: "Sign in — MarginMap" },
      { property: "og:description", content: "Access buyer and reseller product intelligence." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "apple" | null>(null);

  const signInWith = async (provider: "google" | "apple") => {
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if ("redirected" in result && result.redirected) return;
      if (result.error) {
        toast.error(result.error.message ?? "Sign-in failed.");
        return;
      }
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setOauthBusy(null);
    }
  };

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app" });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/app` },
          });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup") toast.success("Account created. You're signed in.");
    navigate({ to: "/app" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <BrandLogo size={36} priority />

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to MarginMap" : "Create your workspace"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Watchlists, deal evaluations and research reports are private to your account.
        </p>

        <div className="mt-6 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={oauthBusy !== null}
            onClick={() => signInWith("google")}
          >
            {oauthBusy === "google" ? "Opening Google…" : "Continue with Google"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={oauthBusy !== null}
            onClick={() => signInWith("apple")}
          >
            {oauthBusy === "apple" ? "Opening Apple…" : "Continue with Apple"}
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-meta">or continue with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          className="mt-4 text-sm text-primary underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <Disclaimer className="mt-8" />
      </div>
    </div>
  );
}
