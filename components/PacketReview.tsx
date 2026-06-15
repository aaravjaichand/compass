"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { reviewRows } from "@/lib/packet/assemble";
import { getProgramById } from "@/lib/directory/search";
import type { AssemblePacket } from "@/lib/packet/schema";

export function PacketReview({
  programIds,
  spec,
  planId,
}: {
  programIds: string[];
  spec: AssemblePacket;
  /** Links the generated packet to a saved plan for persistence. */
  planId?: string | null;
}) {
  const rows = useMemo(
    () => reviewRows(programIds, spec.intakeAnswers),
    [programIds, spec.intakeAnswers],
  );
  const programNames = useMemo(
    () =>
      programIds
        .map((id) => getProgramById(id)?.name ?? id)
        .filter(Boolean),
    [programIds],
  );

  const [answers, setAnswers] = useState<Record<string, string>>(
    spec.intakeAnswers,
  );
  const [letter, setLetter] = useState(spec.coverLetter);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/packet/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programIds,
          intakeAnswers: answers,
          coverLetter: letter,
          planId: planId ?? null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compass-filing-packet.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setError("Couldn't build the packet. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <span className="font-mono text-xs tracking-wide text-muted">
          REVIEW BEFORE YOU FILE
        </span>
        <h2 className="mt-1 text-2xl tracking-tight">
          Check everything, then build your packet
        </h2>
        <p className="mt-2 text-sm text-muted">
          This packet covers {programNames.join(", ")}. Fix anything that looks
          off — Compass fills these into your applications exactly as written.
        </p>
      </div>

      <Card className="space-y-4">
        <h3 className="text-base font-medium">Your details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <Field
              key={row.id}
              id={row.id}
              label={row.label}
              type={row.type}
              options={row.options}
              helpText={row.helpText}
              optional={row.optional}
              value={answers[row.id] ?? ""}
              onChange={(value) =>
                setAnswers((a) => ({ ...a, [row.id]: value }))
              }
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-base font-medium">Cover letter</h3>
        <p className="text-sm text-muted">
          Written in your voice. Edit it freely before you send it.
        </p>
        <Textarea
          aria-label="Cover letter"
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          rows={14}
          className="font-mono text-[13px] leading-relaxed"
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm text-subtle">
          Nothing has been sent. You decide and file. Compass never submits
          anything for you.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={generate} disabled={generating}>
            {generating
              ? "Building your packet…"
              : done
                ? "Download again"
                : "I've reviewed this — generate my packet"}
          </Button>
          {done ? (
            <span className="text-sm text-success">
              Downloaded. Review the PDF, then file it.
            </span>
          ) : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Card>
    </section>
  );
}
