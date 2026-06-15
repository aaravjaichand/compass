"use client";

import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { getProgramById } from "@/lib/directory/search";

export type TracePart = {
  type: string;
  data?: unknown;
};

type StepData = {
  name: string;
  input?: {
    needs?: string[];
    keywords?: string;
    category?: string;
    county?: string;
    programId?: string;
  };
  count?: number;
};

function describe(step: StepData): { title: string; detail?: string } {
  if (step.name === "search_programs") {
    const i = step.input ?? {};
    const query = [...(i.needs ?? []), i.keywords, i.category]
      .filter(Boolean)
      .join(", ");
    const county = i.county ? ` in ${i.county} County` : "";
    const found = step.count !== undefined ? ` — found ${step.count}` : "";
    return {
      title: "Searched the local directory",
      detail: `${query || "programs"}${county}${found}`,
    };
  }

  if (step.name === "get_required_docs") {
    const program = step.input?.programId
      ? getProgramById(step.input.programId)
      : undefined;
    return {
      title: "Checked required documents",
      detail: program?.name ?? step.input?.programId,
    };
  }

  return { title: step.name };
}

export function ReasoningTrace({ parts }: { parts: TracePart[] }) {
  const steps = parts.filter((p) => p.type === "data-step");
  if (steps.length === 0) return null;

  return (
    <Card className="bg-surface-2 print:hidden">
      <p className="font-mono text-xs tracking-wide text-subtle">
        HOW COMPASS WORKED
      </p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((p, i) => {
          const { title, detail } = describe(p.data as StepData);
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5">
                <StatusDot tone="success" />
              </span>
              <div>
                <span className="text-fg">{title}</span>
                {detail ? <span className="text-muted"> — {detail}</span> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
