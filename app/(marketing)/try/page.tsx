import type { Metadata } from "next";
import { AssessExperience } from "@/components/AssessExperience";

export const metadata: Metadata = {
  title: "Try Compass",
  description:
    "Describe a situation in plain language and watch Compass assemble a grounded, ready-to-file plan of local aid. No sign-in.",
};

export default function TryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-8">
      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
        <span className="font-mono text-xs tracking-wide text-muted">
          LIVE DEMO · NO SIGN-IN
        </span>
        <p className="mt-1 text-sm text-muted">
          This is the real agent on a real local directory. Describe a situation
          — or try Marisol&apos;s example — and watch it plan, match, and
          assemble. Nothing is ever submitted for you.
        </p>
      </div>
      <AssessExperience guest />
    </div>
  );
}
