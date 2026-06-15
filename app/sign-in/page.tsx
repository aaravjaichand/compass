"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setError(error.message ?? "Couldn't sign in. Check your details.");
      setBusy(false);
      return;
    }
    // Hard navigation so server components pick up the new session cookie.
    window.location.assign("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <span className="font-mono text-xs tracking-wide text-muted">
        WELCOME BACK
      </span>
      <h1 className="mt-3 text-2xl tracking-tight">Sign in to Compass</h1>
      <p className="mt-2 text-sm text-muted">
        Your saved plans and packets are private to your account.
      </p>

      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Email
            </span>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">
              Password
            </span>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full justify-center">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-sm text-muted">
        New to Compass?{" "}
        <Link href="/sign-up" className="text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
