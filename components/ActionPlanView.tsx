"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusDot, type Tone } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { getProgramById } from "@/lib/directory/search";
import type { ActionPlan, PlanMatch } from "@/lib/agent/schema";

const CONFIDENCE: Record<PlanMatch["confidence"], { tone: Tone; label: string }> = {
  high: { tone: "success", label: "Likely a fit" },
  medium: { tone: "warning", label: "Possible fit" },
  low: { tone: "danger", label: "Uncertain" },
};

const FLAG_INFO: Record<
  ActionPlan["flags"][number],
  { tone: Tone; label: string; text: string }
> = {
  low_confidence: {
    tone: "warning",
    label: "Low confidence",
    text: "Some matches are uncertain — confirm with the office before relying on them.",
  },
  minor_benefits: {
    tone: "warning",
    label: "Involves a child's benefits",
    text: "Decisions about a child's benefits should involve a trusted adult or caseworker.",
  },
  cross_agency: {
    tone: "warning",
    label: "Cross-agency",
    text: "These programs may overlap or need coordination — check how they affect each other.",
  },
  crisis: {
    tone: "danger",
    label: "Crisis support",
    text: "If you or someone else is in danger, call 911, or call or text 988 for support.",
  },
};

function MatchCard({ match }: { match: PlanMatch }) {
  const program = getProgramById(match.programId);

  // Grounding guard: if the agent cites an id not in the directory, say so
  // rather than rendering unverifiable details.
  if (!program) {
    return (
      <Card className="border-warning/40">
        <p className="text-sm text-muted">
          Compass referenced a program it could not verify in the directory, so
          it has been left out.
        </p>
      </Card>
    );
  }

  const conf = CONFIDENCE[match.confidence];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium leading-snug">{program.name}</h3>
          <p className="text-sm text-muted">{program.org}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot tone={conf.tone} />
          <span className="font-mono text-xs uppercase tracking-wide text-muted">
            {conf.label}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p>
          <span className="text-subtle">Why it fits — </span>
          <span className="text-fg">{match.matchReason}</span>
        </p>
        <p>
          <span className="text-subtle">Eligibility — </span>
          <span className="text-fg">{match.eligibility}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-mono text-xs tracking-wide text-subtle">CALL</dt>
          <dd className="mt-1 font-mono text-fg">{program.contact.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs tracking-wide text-subtle">HOURS</dt>
          <dd className="mt-1 text-fg">{program.hours ?? "—"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="font-mono text-xs tracking-wide text-subtle">WHERE</dt>
          <dd className="mt-1 text-fg">
            {program.location.address ? `${program.location.address}, ` : ""}
            {program.location.city}, {program.location.county} County
          </dd>
        </div>
      </dl>

      <div className="border-t border-border pt-4">
        <p className="font-mono text-xs tracking-wide text-subtle">
          DOCUMENTS TO BRING
        </p>
        <ul className="mt-2 space-y-1.5 text-sm text-fg">
          {program.requiredDocs.map((doc) => (
            <li key={doc} className="flex gap-2">
              <span className="text-subtle">·</span>
              <span>{doc}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-xs text-subtle">
        <span className="font-mono">
          Source: {program.source} · Updated {program.lastUpdated}
        </span>
        {program.isSynthetic ? <Badge>synthetic data</Badge> : null}
      </p>
    </Card>
  );
}

function Checklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (items.length === 0) return null;
  return (
    <Card>
      <h3 className="text-base font-medium">Documents to gather</h3>
      <p className="mt-1 text-sm text-muted">
        One combined checklist across your matched programs.
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item, i) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(checked[i])}
                onChange={() =>
                  setChecked((c) => ({ ...c, [i]: !c[i] }))
                }
                className="mt-0.5 size-4 accent-[var(--accent)]"
              />
              <span className={cn(checked[i] ? "text-subtle line-through" : "text-fg")}>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DraftedEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the text is still visible to copy manually */
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Drafted cover email</h3>
        <Button variant="secondary" onClick={copy} className="print:hidden">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">
        A starting point — adapt it, then send it yourself.
      </p>
      <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-fg">
        {email}
      </pre>
    </Card>
  );
}

export function ActionPlanView({ plan }: { plan: ActionPlan }) {
  const matches = plan.matches ?? [];
  const flags = plan.flags ?? [];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-xs tracking-wide text-muted">
            YOUR ACTION PLAN
          </span>
          <h2 className="mt-1 text-2xl tracking-tight">
            A path you can act on today
          </h2>
        </div>
        <Button
          variant="secondary"
          onClick={() => window.print()}
          className="print:hidden"
        >
          Print / Save as PDF
        </Button>
      </div>

      {plan.situationSummary ? (
        <Card className="bg-surface-2">
          <p className="text-fg">{plan.situationSummary}</p>
        </Card>
      ) : null}

      {flags.length > 0 ? (
        <Card className="space-y-3">
          <p className="font-mono text-xs tracking-wide text-subtle">
            PLEASE NOTE
          </p>
          {flags.map((flag) => {
            const info = FLAG_INFO[flag];
            if (!info) return null;
            return (
              <div key={flag} className="flex items-start gap-3 text-sm">
                <StatusDot tone={info.tone} />
                <p className="text-muted">
                  <span className="text-fg">{info.label}.</span> {info.text}
                </p>
              </div>
            );
          })}
        </Card>
      ) : null}

      <div className="space-y-4">
        {matches.map((match, i) => (
          <MatchCard key={`${match.programId}-${i}`} match={match} />
        ))}
      </div>

      <Checklist items={plan.checklist ?? []} />
      <DraftedEmail email={plan.draftedEmail ?? ""} />

      <p className="text-sm text-subtle">
        Compass prepared this packet. Nothing has been sent. You decide and file.
      </p>
    </section>
  );
}
