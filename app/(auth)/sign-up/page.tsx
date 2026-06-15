"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Step = "form" | "verify";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({ email, name, password });
      setBusy(false);
      if (error) {
        setError(error.message || "Couldn't create your account.");
        return;
      }
      // Neon emails a verification code; collect it next.
      setStep("verify");
    } catch {
      setBusy(false);
      setError("Couldn't create your account. Try a different email.");
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
      if (error) {
        setError(error.message || "That code didn't work. Try again.");
        setBusy(false);
        return;
      }
      window.location.assign("/onboarding");
    } catch {
      setError("That code didn't work. Try again.");
      setBusy(false);
    }
  }

  async function resend() {
    setResent(false);
    setError(null);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) setError(error.message || "Couldn't resend the code.");
      else setResent(true);
    } catch {
      setError("Couldn't resend the code.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      {step === "form" ? (
        <>
          <span className="font-mono text-xs tracking-wide text-muted">
            CREATE YOUR ACCOUNT
          </span>
          <h1 className="mt-3 text-2xl tracking-tight">Get started with Compass</h1>
          <p className="mt-2 text-sm text-muted">
            Your situation and saved plans are encrypted and private. Nothing is
            ever submitted on your behalf.
          </p>

          <Card className="mt-6">
            <form onSubmit={submitForm} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-xs uppercase tracking-wide text-muted">
                  Name
                </span>
                <Input
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button
                type="submit"
                disabled={busy}
                className="w-full justify-center"
              >
                {busy ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </Card>

          <p className="mt-4 text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-accent underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <span className="font-mono text-xs tracking-wide text-muted">
            VERIFY YOUR EMAIL
          </span>
          <h1 className="mt-3 text-2xl tracking-tight">Enter your code</h1>
          <p className="mt-2 text-sm text-muted">
            We emailed a verification code to{" "}
            <span className="text-fg">{email}</span>. Enter it below to finish.
          </p>

          <Card className="mt-6">
            <form onSubmit={submitOtp} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-xs uppercase tracking-wide text-muted">
                  Verification code
                </span>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="font-mono tracking-widest"
                />
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              {resent ? (
                <p className="text-sm text-success">A new code is on its way.</p>
              ) : null}
              <Button
                type="submit"
                disabled={busy}
                className="w-full justify-center"
              >
                {busy ? "Verifying…" : "Verify and continue"}
              </Button>
            </form>
          </Card>

          <button
            type="button"
            onClick={resend}
            className="mt-4 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Didn&apos;t get it? Resend the code.
          </button>
        </>
      )}
    </div>
  );
}
