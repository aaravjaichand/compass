import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { ActionPlanView } from "@/components/ActionPlanView";
import { MARISOL_SAMPLE_PLAN } from "@/lib/sample/marisol-plan";

const STEPS = [
  {
    n: "01",
    label: "DESCRIBE",
    title: "You describe your situation",
    body: "In plain language, typed or spoken. No forms, no jargon, no logging in.",
  },
  {
    n: "02",
    label: "REASON",
    title: "The agent plans and checks",
    body: "It interprets your words, searches a real local directory, and checks rough eligibility — showing its work as it goes.",
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

const MARISOL_NEEDS = [
  "Utility relief",
  "Food assistance",
  "WIC",
  "Food pantry",
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1140px] px-6">
      {/* Hero */}
      <section className="grid gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div className="flex flex-col justify-center">
          <span className="font-mono text-xs tracking-wide text-muted">
            LOCAL AID, MADE CLEAR
          </span>
          <h1 className="mt-4 text-4xl leading-[1.1] tracking-tight md:text-5xl">
            Describe your situation. Get a clear, ready-to-file path to local
            aid.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted">
            Help exists — utility relief, food assistance, housing support — but
            it is scattered across agencies and written for people who are not in
            a crisis. Compass turns a real-life situation into a personalized,
            grounded packet of the right programs, forms, and documents.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/assess">
              <Button>Describe your situation</Button>
            </Link>
            <Link href="/assess?example=marisol">
              <Button variant="secondary">See Marisol&apos;s example</Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-subtle">
            Compass prepares; you decide and file. Nothing is ever submitted for
            you.
          </p>
        </div>

        {/* Marisol vignette — the named user, up front */}
        <Card className="flex flex-col justify-center bg-surface-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs tracking-wide text-muted">
              WHO THIS IS FOR
            </span>
            <Badge>Jersey City · Hudson</Badge>
          </div>
          <p className="mt-4 text-lg leading-relaxed text-fg">
            <span className="font-medium">Marisol, 34.</span> Her hours were just
            cut. An electricity shutoff notice arrived, the fridge is nearly
            empty, and her two kids are at home.
          </p>
          <p className="mt-3 text-sm text-muted">
            One situation. Four different programs, each with its own office and
            paperwork — the kind of thing a search box can&apos;t assemble.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {MARISOL_NEEDS.map((need) => (
              <Badge key={need}>{need}</Badge>
            ))}
          </div>
        </Card>
      </section>

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

      {/* A real example — the output shape, shown before the sign-in wall */}
      <section className="border-t border-border py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl tracking-tight">What Compass produces</h2>
            <p className="mt-2 max-w-xl text-muted">
              A real example of the packet Marisol receives — matched programs,
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
          <h2 className="text-2xl tracking-tight">Why an agent, not a search box</h2>
          <p className="mt-4 max-w-xl text-muted">
            A web search returns ten links and leaves the work to you — figuring
            out which programs apply, whether you qualify, and what each one
            needs. Compass does that reasoning: it plans the lookups, matches a
            real directory, checks rough eligibility, and assembles the paperwork
            into one packet.
          </p>
        </div>
        <Card className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <StatusDot tone="success" />
            <p className="text-sm text-muted">
              <span className="text-fg">Every match shows its reasoning</span> —
              why it fit, a confidence level, and its source in the directory.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <StatusDot tone="warning" />
            <p className="text-sm text-muted">
              <span className="text-fg">Eligibility is rough, never a verdict.</span>{" "}
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
  );
}
