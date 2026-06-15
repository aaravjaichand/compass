"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionPlanView } from "@/components/ActionPlanView";
import { ReasoningTrace, type TracePart } from "@/components/ReasoningTrace";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { ActionPlan } from "@/lib/agent/schema";

type PartLike = TracePart & { text?: string };

const MARISOL_EXAMPLE =
  "I live in Jersey City with my two kids, ages 5 and 8. My hours at work were just cut and I'm only bringing in about $1,800 a month now, and I rent my apartment. I just got a notice that my electricity will be shut off next week, and our fridge is almost empty. I don't know where to start or what help I can get.";

function textOf(parts: PartLike[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

// Assistant text (clarifying questions / notes) arrives as data-note parts.
function noteOf(parts: PartLike[]): string {
  return parts
    .filter((p) => p.type === "data-note")
    .map((p) => String((p.data as { text?: string })?.text ?? ""))
    .join("\n")
    .trim();
}

function WorkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="flex gap-1">
        <span className="size-1.5 animate-pulse rounded-full bg-subtle [animation-delay:0ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-subtle [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-subtle [animation-delay:300ms]" />
      </span>
      Compass is working…
    </div>
  );
}

export default function AssessPage() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const sentExample = useRef(false);

  const busy = status === "submitted" || status === "streaming";
  const started = messages.length > 0;

  // Auto-run Marisol's example when arriving from the landing CTA.
  useEffect(() => {
    if (sentExample.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("example") === "marisol") {
      sentExample.current = true;
      sendMessage({ text: MARISOL_EXAMPLE });
    }
  }, [sendMessage]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      {!started ? (
        <header className="print:hidden">
          <span className="font-mono text-xs tracking-wide text-muted">
            DESCRIBE YOUR SITUATION
          </span>
          <h1 className="mt-3 text-3xl tracking-tight">
            Tell Compass what&apos;s going on
          </h1>
          <p className="mt-3 text-muted">
            In your own words — what happened, who&apos;s affected, and where you
            live. Compass finds local programs, checks rough eligibility, and
            prepares a packet you can act on. It never submits anything for you.
          </p>
        </header>
      ) : null}

      <div className="space-y-6">
        {messages.map((m) => {
          const parts = m.parts as PartLike[];

          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end print:hidden">
                <div className="max-w-[85%] rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-fg">
                  {textOf(parts)}
                </div>
              </div>
            );
          }

          const note = noteOf(parts);
          const planPart = parts.find((p) => p.type === "data-plan");

          return (
            <div key={m.id} className="space-y-4">
              <ReasoningTrace parts={parts} />
              {note ? (
                <p className="whitespace-pre-wrap text-fg print:hidden">{note}</p>
              ) : null}
              {planPart?.data ? (
                <ActionPlanView plan={planPart.data as ActionPlan} />
              ) : null}
            </div>
          );
        })}

        {busy ? <WorkingIndicator /> : null}

        {error ? (
          <p className="text-sm text-danger print:hidden">
            Something went wrong reaching the assistant. Please try again.
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-6 print:hidden"
      >
        <Textarea
          aria-label="Describe your situation"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={started ? 2 : 5}
          placeholder={
            started
              ? "Reply to Compass…"
              : "For example: I live in Jersey City, my hours got cut, and I got an electricity shutoff notice…"
          }
          disabled={busy}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" disabled={busy || !input.trim()}>
            {started ? "Send" : "Get my plan"}
          </Button>
          {!started ? (
            <button
              type="button"
              onClick={() => submit(MARISOL_EXAMPLE)}
              disabled={busy}
              className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
            >
              Not sure where to start? Try Marisol&apos;s example.
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
