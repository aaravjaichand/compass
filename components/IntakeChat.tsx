"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Markdown } from "@/components/Markdown";
import { WorkingIndicator } from "@/components/WorkingIndicator";
import { assemblePacketSchema, type AssemblePacket } from "@/lib/packet/schema";

type PartLike = { type: string; text?: string; data?: unknown };

const SEED = "I'm ready to prepare my filing packet.";

function textOf(parts: PartLike[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function noteOf(parts: PartLike[]): string {
  return parts
    .filter((p) => p.type === "data-note")
    .map((p) => String((p.data as { text?: string })?.text ?? ""))
    .join("\n")
    .trim();
}

/**
 * A second, self-contained chat that runs the conversational intake against
 * /api/intake. It seeds itself, streams the interview, and lifts the finalized
 * packet (the data-packet part) up to the parent via onPacket.
 */
export function IntakeChat({
  programIds,
  situation,
  onPacket,
}: {
  programIds: string[];
  situation: string;
  onPacket: (spec: AssemblePacket) => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/intake",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, programIds, situation },
        }),
      }),
    [programIds, situation],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const seeded = useRef(false);
  const delivered = useRef(false);

  const busy = status === "submitted" || status === "streaming";

  // Kick off the interview once.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    sendMessage({ text: SEED });
  }, [sendMessage]);

  // Lift the finalized packet to the parent (once).
  useEffect(() => {
    if (delivered.current) return;
    for (const m of messages) {
      const part = (m.parts as PartLike[]).find((p) => p.type === "data-packet");
      if (part?.data) {
        const parsed = assemblePacketSchema.safeParse(part.data);
        if (parsed.success) {
          delivered.current = true;
          onPacket(parsed.data);
          return;
        }
      }
    }
  }, [messages, onPacket]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <section className="space-y-5 print:hidden">
      <div>
        <span className="font-mono text-xs tracking-wide text-muted">
          PREPARING YOUR PACKET
        </span>
        <h2 className="mt-1 text-2xl tracking-tight">
          A few questions, then your packet
        </h2>
        <p className="mt-2 text-sm text-muted">
          Answer in your own words. You can ask Compass anything along the way.
          Nothing is submitted.
        </p>
      </div>

      <div className="space-y-4">
        {messages.map((m) => {
          const parts = m.parts as PartLike[];
          if (m.role === "user") {
            const text = textOf(parts);
            if (!text || text === SEED) return null; // hide the hidden seed
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-fg">
                  {text}
                </div>
              </div>
            );
          }
          const note = noteOf(parts);
          if (!note) return null;
          return <Markdown key={m.id}>{note}</Markdown>;
        })}

        {busy ? <WorkingIndicator /> : null}
        {error ? (
          <p className="text-sm text-danger">
            Something went wrong reaching Compass. Please try again.
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          aria-label="Answer Compass"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={2}
          placeholder="Answer Compass…"
          disabled={busy}
        />
        <div className="mt-3">
          <Button type="submit" disabled={busy || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
