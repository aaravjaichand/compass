"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionPlanView, type Lang } from "@/components/ActionPlanView";
import { Markdown } from "@/components/Markdown";
import { PacketReview } from "@/components/PacketReview";
import { PreparePacketCTA } from "@/components/PreparePacketCTA";
import { ReasoningTrace, type TracePart } from "@/components/ReasoningTrace";
import { WorkingIndicator } from "@/components/WorkingIndicator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import type { ActionPlan } from "@/lib/agent/schema";
import type { AssemblePacket } from "@/lib/packet/schema";
import { computeRequiredFields } from "@/lib/packet/assemble";
import { fillCoverLetter } from "@/lib/packet/coverLetter";
import { getProgramById } from "@/lib/directory/search";

type PartLike = TracePart & { text?: string };
type PacketPhase = "plan" | "review";

const MARISOL_EXAMPLE =
  "I live in Jersey City with my two kids, ages 5 and 8. My hours at work were just cut and I'm only bringing in about $1,800 a month now, and I rent my apartment. I just got a notice that my electricity will be shut off next week, and our fridge is almost empty. I don't know where to start or what help I can get.";

const MARISOL_EXAMPLE_ES =
  "Vivo en Jersey City con mis dos hijos, de 5 y 8 años. Me redujeron las horas en el trabajo y ahora solo gano unos $1,800 al mes, y alquilo mi apartamento. Acabo de recibir un aviso de que me van a cortar la electricidad la próxima semana, y el refrigerador está casi vacío. No sé por dónde empezar ni qué ayuda puedo conseguir.";

const UI: Record<Lang, Record<string, string>> = {
  en: {
    eyebrow: "DESCRIBE YOUR SITUATION",
    title: "Tell Compass what's going on",
    intro:
      "In your own words — what happened, who's affected, and where you live. Compass finds local programs, checks rough eligibility, and prepares a packet you can act on. It never submits anything for you.",
    placeholderStart:
      "For example: I live in Jersey City, my hours got cut, and I got an electricity shutoff notice…",
    placeholderReply: "Reply to Compass…",
    getPlan: "Get my plan",
    send: "Send",
    tryExample: "Not sure where to start? Try Marisol's example.",
    error: "Something went wrong reaching the assistant. Please try again.",
    ariaDescribe: "Describe your situation",
    shareTitle: "Get help from someone you trust",
    shareSub:
      "Create a private link to this plan and send it to a family member, friend, or caseworker who can help you file. Nothing is ever submitted.",
    shareCreate: "Create a share link",
    shareCreating: "Creating…",
    shareCopy: "Copy link",
    shareCopied: "Copied",
  },
  es: {
    eyebrow: "DESCRIBE TU SITUACIÓN",
    title: "Cuéntale a Compass qué está pasando",
    intro:
      "En tus propias palabras — qué pasó, a quién afecta y dónde vives. Compass busca programas locales, revisa tu elegibilidad aproximada y prepara un paquete con el que puedes actuar. Nunca envía nada por ti.",
    placeholderStart:
      "Por ejemplo: Vivo en Jersey City, me redujeron las horas y recibí un aviso de corte de electricidad…",
    placeholderReply: "Responde a Compass…",
    getPlan: "Ver mi plan",
    send: "Enviar",
    tryExample: "¿No sabes por dónde empezar? Prueba el ejemplo de Marisol.",
    error: "Algo salió mal al contactar al asistente. Inténtalo de nuevo.",
    ariaDescribe: "Describe tu situación",
    shareTitle: "Pide ayuda a alguien de confianza",
    shareSub:
      "Crea un enlace privado a este plan y envíalo a un familiar, amigo o trabajador social que pueda ayudarte a presentarlo. Nunca se envía nada.",
    shareCreate: "Crear enlace para compartir",
    shareCreating: "Creando…",
    shareCopy: "Copiar enlace",
    shareCopied: "Copiado",
  },
};

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

/**
 * The full describe → reason → plan → packet experience. Shared by the
 * authenticated `/assess` route and the public `/try` demo.
 *
 * When `guest`, nothing is persisted (no profile prefill, no transcript/plan
 * snapshot) and the packet flow — which needs a saved plan and the user's
 * profile — is hidden. Judges can reach the agent and its grounded plan with
 * no account.
 */
export function AssessExperience({ guest = false }: { guest?: boolean }) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Lang>("en");
  const sentExample = useRef(false);

  const [packetPhase, setPacketPhase] = useState<PacketPhase>("plan");
  const [packetSpec, setPacketSpec] = useState<AssemblePacket | null>(null);

  // The saved profile (decrypted server-side), used to prefill the packet form.
  const [profileData, setProfileData] = useState<Record<string, string>>({});

  // Persistence handles: the conversation we're appending to and its saved plan.
  const conversationId = useRef<string | null>(null);
  const savedSignature = useRef<string>("");
  const [planId, setPlanId] = useState<string | null>(null);

  // Share / hand-off: a public read-only link to the current plan.
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const busy = status === "submitted" || status === "streaming";
  const started = messages.length > 0;
  const ui = UI[language];

  // Send a turn, telling the agent which language to answer in.
  const send = (text: string, lang: Lang) =>
    sendMessage({ text }, { body: { language: lang } });

  // The most recent grounded action plan, if one has streamed in.
  const plan = useMemo<ActionPlan | undefined>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const part = (messages[i].parts as PartLike[]).find(
        (p) => p.type === "data-plan",
      );
      if (part?.data) return part.data as ActionPlan;
    }
    return undefined;
  }, [messages]);

  // Authoritative target ids: matched programs that actually resolve in the directory.
  const programIds = useMemo(
    () =>
      (plan?.matches ?? [])
        .map((m) => m.programId)
        .filter((id) => Boolean(getProgramById(id))),
    [plan],
  );

  // Load the saved profile once, to prefill the packet form (no PII to the LLM).
  useEffect(() => {
    if (guest) return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.profile?.data) setProfileData(res.profile.data);
      })
      .catch(() => {});
  }, [guest]);

  // Auto-run Marisol's example when arriving from the landing CTA. A `lang=es`
  // param opens the demo straight into Spanish.
  useEffect(() => {
    if (sentExample.current) return;
    const params = new URLSearchParams(window.location.search);
    const urlLang: Lang = params.get("lang") === "es" ? "es" : "en";
    // One-time sync of a client-only query param into state on mount; doing it
    // in a lazy initializer would mismatch the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urlLang === "es") setLanguage("es");
    if (params.get("example") === "marisol") {
      sentExample.current = true;
      send(urlLang === "es" ? MARISOL_EXAMPLE_ES : MARISOL_EXAMPLE, urlLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After each completed turn, persist the transcript + plan (encrypted server-side).
  useEffect(() => {
    if (guest) return;
    if (status !== "ready" || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const signature = `${messages.length}:${last?.id ?? ""}`;
    if (signature === savedSignature.current) return;
    savedSignature.current = signature;

    const transcript = messages.map((m) => {
      const parts = m.parts as PartLike[];
      if (m.role === "user") {
        return { role: "user" as const, text: textOf(parts) };
      }
      return {
        role: "assistant" as const,
        text: noteOf(parts),
        // Keep non-PII structured parts (reasoning steps, plan) for re-render.
        parts: parts.filter(
          (p) => p.type !== "text" && p.type !== "data-note",
        ),
      };
    });

    fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationId.current,
        transcript,
        plan: plan ?? null,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res) {
          conversationId.current = res.conversationId;
          setPlanId(res.planId);
        }
      })
      .catch(() => {});
  }, [guest, status, messages, plan]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    send(trimmed, language);
    setInput("");
  }

  // Mint a public, read-only link to the current plan to hand off to a helper.
  async function share() {
    if (!plan || sharing) return;
    setSharing(true);
    try {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, lang: language }),
      });
      if (r.ok) {
        const { token } = await r.json();
        setShareUrl(`${window.location.origin}/share/${token}`);
      }
    } catch {
      /* surfaced as a no-op; the button stays available to retry */
    } finally {
      setSharing(false);
    }
  }

  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the link is still visible to copy manually */
    }
  }

  // Move from plan to packet: prefill required fields from the profile and fill
  // the cover letter locally from the agent's bracketed draft.
  function startPacket() {
    if (!plan) return;
    const prefill: Record<string, string> = {};
    for (const f of computeRequiredFields(programIds)) {
      const v = profileData[f.id];
      if (v) prefill[f.id] = v;
    }
    setPacketSpec({
      programIds,
      intakeAnswers: prefill,
      coverLetter: fillCoverLetter(plan.draftedEmail ?? "", prefill),
    });
    setPacketPhase("review");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      {!started ? (
        <header className="print:hidden">
          <span className="font-mono text-xs tracking-wide text-muted">
            {ui.eyebrow}
          </span>
          <h1 className="mt-3 text-3xl tracking-tight">{ui.title}</h1>
          <p className="mt-3 text-muted">{ui.intro}</p>
          <div className="mt-5 inline-flex rounded-md border border-border p-0.5 text-xs font-medium">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={cn(
                  "rounded px-3 py-1.5 transition-colors",
                  language === l
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:text-fg",
                )}
              >
                {l === "en" ? "English" : "Español"}
              </button>
            ))}
          </div>
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
                <div className="print:hidden">
                  <Markdown>{note}</Markdown>
                </div>
              ) : null}
              {planPart?.data ? (
                <ActionPlanView
                  plan={planPart.data as ActionPlan}
                  lang={language}
                />
              ) : null}
            </div>
          );
        })}

        {busy ? <WorkingIndicator /> : null}

        {error ? (
          <p className="text-sm text-danger print:hidden">{ui.error}</p>
        ) : null}

        {/* Packet flow — layered on top of the action plan, never replacing it.
            Hidden for guests: it needs a saved plan and the user's profile. */}
        {!guest && plan && packetPhase === "plan" && programIds.length > 0 ? (
          <PreparePacketCTA onStart={startPacket} disabled={busy} />
        ) : null}

        {!guest && packetPhase === "review" && packetSpec ? (
          <PacketReview
            programIds={programIds}
            spec={packetSpec}
            planId={planId}
          />
        ) : null}

        {/* Hand-off: a public read-only link a helper can open. Works for guests. */}
        {plan ? (
          <Card className="print:hidden">
            <h3 className="text-base font-medium">{ui.shareTitle}</h3>
            <p className="mt-1 text-sm text-muted">{ui.shareSub}</p>
            {shareUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={ui.shareTitle}
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-fg"
                />
                <Button variant="secondary" onClick={copyShare}>
                  {shareCopied ? ui.shareCopied : ui.shareCopy}
                </Button>
              </div>
            ) : (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={share}
                  disabled={sharing}
                >
                  {sharing ? ui.shareCreating : ui.shareCreate}
                </Button>
              </div>
            )}
          </Card>
        ) : null}
      </div>

      {packetPhase === "plan" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mt-6 print:hidden"
        >
          <Textarea
            aria-label={ui.ariaDescribe}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={started ? 2 : 5}
            placeholder={started ? ui.placeholderReply : ui.placeholderStart}
            disabled={busy}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button type="submit" disabled={busy || !input.trim()}>
              {started ? ui.send : ui.getPlan}
            </Button>
            {!started ? (
              <button
                type="button"
                onClick={() =>
                  submit(language === "es" ? MARISOL_EXAMPLE_ES : MARISOL_EXAMPLE)
                }
                disabled={busy}
                className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
              >
                {ui.tryExample}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
