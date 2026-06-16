import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { Logo } from "@/components/Logo";
import { ActionPlanView } from "@/components/ActionPlanView";
import { MARISOL_SAMPLE_PLAN } from "@/lib/sample/marisol-plan";

const STEPS = [
  {
    n: "01",
    label: "DESCRIBE",
    title: "You describe your situation",
    body: "In plain language. No forms, no jargon, no logging in.",
  },
  {
    n: "02",
    label: "REASON",
    title: "The agent plans and checks",
    body: "It interprets your words, searches a real local directory, and checks rough eligibility, showing its work as it goes.",
  },
  {
    n: "03",
    label: "ASSEMBLE",
    title: "You get a ready-to-file packet",
    body: "Matched programs with why each fit, a confidence level, the documents to bring, where to go, and a drafted cover email.",
  },
  {
    n: "04",
    label: "DECIDE",
    title: "You decide and file",
    body: "Compass never submits anything. You review, choose, and take the next step in control.",
  },
];

const MARISOL_NEEDS = ["Utility relief", "Food assistance", "WIC", "Food pantry"];

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero: full-bleed, with a faint compass watermark + blueprint grid for atmosphere */}
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg className="absolute inset-y-0 right-0 w-2/3 text-border opacity-60">
            <defs>
              <pattern
                id="hero-grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
          <Logo
            mono
            decorative
            className="absolute -top-20 -right-16 size-[360px] text-border opacity-70 md:size-[480px]"
          />
        </div>

        <div className="relative mx-auto max-w-[1140px] px-6 py-20 md:py-28">
          {/* Editorial eyebrow: label, hairline, coordinates (the compass metaphor) */}
          <div
            className="fade-up flex items-center gap-4 font-mono text-xs tracking-wide text-muted"
            style={{ animationDelay: "0ms" }}
          >
            <span>LOCAL AID, MADE CLEAR</span>
            <span className="h-px flex-1 bg-border" />
            <span className="hidden text-subtle sm:inline">40.72° N · 74.04° W</span>
          </div>

          <div className="mt-10 grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div
              className="fade-up flex flex-col justify-center"
              style={{ animationDelay: "80ms" }}
            >
              <h1 className="text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
                Describe your situation.{" "}
                <span className="text-muted">
                  Get a clear, ready-to-file path to local aid.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base text-muted">
                Help exists (utility relief, food assistance, housing support),
                but it is scattered across agencies and written for people who
                are not in a crisis. Compass turns a real-life situation into a
                personalized, grounded packet of the right programs, forms, and
                documents.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/try">
                  <Button>Describe your situation</Button>
                </Link>
                <Link href="/try?example=marisol">
                  <Button variant="secondary">See Marisol&apos;s example</Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-subtle">
                Compass prepares; you decide and file. Nothing is ever submitted
                for you.
              </p>
            </div>

            {/* Marisol "case file": the named user, framed as a record */}
            <div
              className="fade-up flex flex-col justify-center"
              style={{ animationDelay: "180ms" }}
            >
              <div className="overflow-hidden rounded-lg border border-border bg-surface-2/60">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <span className="font-mono text-xs tracking-wide text-muted">
                    WHO THIS IS FOR
                  </span>
                  <span className="font-mono text-xs text-subtle">CASE 001</span>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <p className="text-lg leading-relaxed text-fg">
                    <span className="font-medium">Marisol, 34.</span> Her hours
                    were just cut. An electricity shutoff notice arrived, the
                    fridge is nearly empty, and her two kids are at home.
                  </p>
                  <p className="text-sm text-muted">
                    One situation. Four different programs, each with its own
                    office and paperwork: the kind of thing a search box
                    can&apos;t assemble.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {MARISOL_NEEDS.map((need) => (
                      <Badge key={need}>{need}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-border pt-4 font-mono text-xs text-subtle">
                    <span>JERSEY CITY</span>
                    <span className="text-border">/</span>
                    <span>40.72° N, 74.04° W</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spec strip: quiet credibility, mono with hairline dividers */}
          <div
            className="fade-up mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-6 font-mono text-xs tracking-wide text-subtle"
            style={{ animationDelay: "260ms" }}
          >
            <span>211-ANCHORED DIRECTORY</span>
            <span className="text-border">·</span>
            <span>HUDSON + BERGEN COUNTY</span>
            <span className="text-border">·</span>
            <span>EN · ES</span>
            <span className="text-border">·</span>
            <span>HUMAN-IN-THE-LOOP</span>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1140px] px-6">
        {/* How it works */}
        <section className="border-t border-border py-16">
          <h2 className="text-2xl tracking-tight">How it works</h2>
          <p className="mt-2 text-muted">
            A single path from uncertainty to a next action.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <Card key={step.n} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-accent">{step.n}</span>
                  <span className="font-mono text-xs tracking-wide text-subtle">
                    {step.label}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* A real example: the output shape, shown before the sign-in wall */}
        <section className="border-t border-border py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl tracking-tight">What Compass produces</h2>
              <p className="mt-2 max-w-xl text-muted">
                A real example of the packet Marisol receives: matched programs,
                why each fits, a confidence level, the documents to bring, and a
                drafted cover email.
              </p>
            </div>
            <Badge>Example · read-only</Badge>
          </div>
          <Card className="mt-8 bg-surface-2/40">
            <ActionPlanView plan={MARISOL_SAMPLE_PLAN} sample />
          </Card>
        </section>

        {/* Why an agent */}
        <section className="grid gap-8 border-t border-border py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl tracking-tight">
              Why an agent, not a search box
            </h2>
            <p className="mt-4 max-w-xl text-muted">
              A web search returns ten links and leaves the work to you:
              figuring out which programs apply, whether you qualify, and what
              each one needs. Compass does that reasoning: it plans the lookups,
              matches a real directory, checks rough eligibility, and assembles
              the paperwork into one packet.
            </p>
          </div>
          <Card className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <StatusDot tone="success" />
              <p className="text-sm text-muted">
                <span className="text-fg">Every match shows its reasoning:</span>{" "}
                why it fit, a confidence level, and its source in the directory.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <StatusDot tone="warning" />
              <p className="text-sm text-muted">
                <span className="text-fg">
                  Eligibility is rough, never a verdict.
                </span>{" "}
                Uncertain cases are flagged for a person to confirm.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <StatusDot tone="danger" />
              <p className="text-sm text-muted">
                <span className="text-fg">No autonomous submit.</span> Compass
                prepares the packet; you stay in control of filing.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
