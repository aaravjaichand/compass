"use client";

import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { getProgramById } from "@/lib/directory/search";

export type TracePart = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

type SearchInput = {
  needs?: string[];
  keywords?: string;
  category?: string;
  county?: string;
};

function describe(
  name: string,
  input: unknown,
  output: unknown,
): { title: string; detail?: string; done: boolean } {
  if (name === "search_programs") {
    const i = (input ?? {}) as SearchInput;
    const query = [...(i.needs ?? []), i.keywords, i.category]
      .filter(Boolean)
      .join(", ");
    const county = i.county ? ` in ${i.county} County` : "";
    const count = Array.isArray(output) ? output.length : undefined;
    return {
      title: "Searched the local directory",
      detail: `${query || "programs"}${county}${
        count !== undefined ? ` — found ${count}` : ""
      }`,
      done: count !== undefined,
    };
  }

  if (name === "get_required_docs") {
    const programId = (input as { programId?: string } | undefined)?.programId;
    const program = programId ? getProgramById(programId) : undefined;
    return {
      title: "Checked required documents",
      detail: program?.name ?? programId,
      done: output != null,
    };
  }

  return { title: name, done: output != null };
}

export function ReasoningTrace({ parts }: { parts: TracePart[] }) {
  const steps = parts.filter(
    (p) => p.type.startsWith("tool-") && p.type !== "tool-present_action_plan",
  );
  if (steps.length === 0) return null;

  return (
    <Card className="bg-surface-2 print:hidden">
      <p className="font-mono text-xs tracking-wide text-subtle">
        HOW COMPASS WORKED
      </p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((p, i) => {
          const name = p.type.slice("tool-".length);
          const { title, detail, done } = describe(name, p.input, p.output);
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5">
                <StatusDot tone={done ? "success" : "muted"} />
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
