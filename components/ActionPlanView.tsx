"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusDot, type Tone } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";
import { getProgramById } from "@/lib/directory/search";
import { HelpMap, type MapPoint } from "@/components/HelpMap";
import type { ActionPlan, PlanMatch } from "@/lib/agent/schema";

export type Lang = "en" | "es";

const CONFIDENCE: Record<
  Lang,
  Record<PlanMatch["confidence"], { tone: Tone; label: string }>
> = {
  en: {
    high: { tone: "success", label: "Likely a fit" },
    medium: { tone: "warning", label: "Possible fit" },
    low: { tone: "danger", label: "Uncertain" },
  },
  es: {
    high: { tone: "success", label: "Probable" },
    medium: { tone: "warning", label: "Posible" },
    low: { tone: "danger", label: "Incierto" },
  },
};

const FLAG_INFO: Record<
  Lang,
  Record<ActionPlan["flags"][number], { tone: Tone; label: string; text: string }>
> = {
  en: {
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
  },
  es: {
    low_confidence: {
      tone: "warning",
      label: "Confianza baja",
      text: "Algunas opciones son inciertas — confírmalas con la oficina antes de contar con ellas.",
    },
    minor_benefits: {
      tone: "warning",
      label: "Involucra los beneficios de un menor",
      text: "Las decisiones sobre los beneficios de un menor deben involucrar a un adulto de confianza o a un trabajador social.",
    },
    cross_agency: {
      tone: "warning",
      label: "Entre varias agencias",
      text: "Estos programas pueden superponerse o necesitar coordinación — revisa cómo se afectan entre sí.",
    },
    crisis: {
      tone: "danger",
      label: "Apoyo en crisis",
      text: "Si tú u otra persona están en peligro, llama al 911, o llama o envía un mensaje al 988 para recibir apoyo.",
    },
  },
};

const T: Record<Lang, Record<string, string>> = {
  en: {
    unverified:
      "Compass referenced a program it could not verify in the directory, so it has been left out.",
    whyItFits: "Why it fits — ",
    eligibility: "Eligibility — ",
    call: "CALL",
    hours: "HOURS",
    where: "WHERE",
    county: "County",
    docsToBring: "DOCUMENTS TO BRING",
    source: "Source:",
    updated: "Updated",
    gatherTitle: "Documents to gather",
    gatherSub: "One combined checklist across your matched programs.",
    emailTitle: "Drafted cover email",
    emailSub: "A starting point — adapt it, then send it yourself.",
    copy: "Copy",
    copied: "Copied",
    yourPlan: "YOUR ACTION PLAN",
    examplePlan: "EXAMPLE ACTION PLAN",
    planHeading: "A path you can act on today",
    print: "Print / Save as PDF",
    pleaseNote: "PLEASE NOTE",
    helpNearYou: "Help near you",
    helpNearYouSub:
      "The offices and pantries matched to you — tap a point for hours and directions.",
    footer:
      "Compass prepared this packet. Nothing has been sent. You decide and file.",
  },
  es: {
    unverified:
      "Compass mencionó un programa que no pudo verificar en el directorio, así que se omitió.",
    whyItFits: "Por qué encaja — ",
    eligibility: "Elegibilidad — ",
    call: "LLAMAR",
    hours: "HORARIO",
    where: "DÓNDE",
    county: "Condado",
    docsToBring: "DOCUMENTOS QUE LLEVAR",
    source: "Fuente:",
    updated: "Actualizado",
    gatherTitle: "Documentos que reunir",
    gatherSub: "Una sola lista combinada para todos tus programas.",
    emailTitle: "Correo de presentación redactado",
    emailSub: "Un punto de partida — adáptalo y envíalo tú mismo.",
    copy: "Copiar",
    copied: "Copiado",
    yourPlan: "TU PLAN DE ACCIÓN",
    examplePlan: "PLAN DE ACCIÓN DE EJEMPLO",
    planHeading: "Un camino que puedes seguir hoy",
    print: "Imprimir / Guardar como PDF",
    pleaseNote: "TEN EN CUENTA",
    helpNearYou: "Ayuda cerca de ti",
    helpNearYouSub:
      "Las oficinas y despensas que te corresponden — toca un punto para ver el horario y cómo llegar.",
    footer:
      "Compass preparó este paquete. No se ha enviado nada. Tú decides y lo presentas.",
  },
};

/** Resolve matched programs that have coordinates into points for the map. */
function mapPointsFor(matches: PlanMatch[]): MapPoint[] {
  const seen = new Set<string>();
  const points: MapPoint[] = [];
  for (const m of matches) {
    const p = getProgramById(m.programId);
    if (!p || !p.location.geo || seen.has(p.id)) continue;
    seen.add(p.id);
    const { address, city, county, zip } = p.location;
    points.push({
      id: p.id,
      name: p.name,
      org: p.org,
      hours: p.hours,
      phone: p.contact.phone,
      address: [address, city, `${county} County`, zip, "NJ"]
        .filter(Boolean)
        .join(", "),
      lat: p.location.geo.lat,
      lng: p.location.geo.lng,
    });
  }
  return points;
}

function MatchCard({ match, lang }: { match: PlanMatch; lang: Lang }) {
  const program = getProgramById(match.programId);
  const t = T[lang];

  // Grounding guard: if the agent cites an id not in the directory, say so
  // rather than rendering unverifiable details.
  if (!program) {
    return (
      <Card className="border-warning/40">
        <p className="text-sm text-muted">{t.unverified}</p>
      </Card>
    );
  }

  const conf = CONFIDENCE[lang][match.confidence];

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
          <span className="text-subtle">{t.whyItFits}</span>
          <span className="text-fg">{match.matchReason}</span>
        </p>
        <p>
          <span className="text-subtle">{t.eligibility}</span>
          <span className="text-fg">{match.eligibility}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-mono text-xs tracking-wide text-subtle">{t.call}</dt>
          <dd className="mt-1 font-mono text-fg">{program.contact.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs tracking-wide text-subtle">{t.hours}</dt>
          <dd className="mt-1 text-fg">{program.hours ?? "—"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="font-mono text-xs tracking-wide text-subtle">{t.where}</dt>
          <dd className="mt-1 text-fg">
            {program.location.address ? `${program.location.address}, ` : ""}
            {program.location.city}, {program.location.county} {t.county}
          </dd>
        </div>
      </dl>

      <div className="border-t border-border pt-4">
        <p className="font-mono text-xs tracking-wide text-subtle">
          {t.docsToBring}
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
          {t.source} {program.source} · {t.updated} {program.lastUpdated}
        </span>
        {program.isSynthetic ? <Badge>synthetic data</Badge> : null}
      </p>
    </Card>
  );
}

function Checklist({ items, lang }: { items: string[]; lang: Lang }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const t = T[lang];
  if (items.length === 0) return null;
  return (
    <Card>
      <h3 className="text-base font-medium">{t.gatherTitle}</h3>
      <p className="mt-1 text-sm text-muted">{t.gatherSub}</p>
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

function DraftedEmail({ email, lang }: { email: string; lang: Lang }) {
  const [copied, setCopied] = useState(false);
  const t = T[lang];
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
        <h3 className="text-base font-medium">{t.emailTitle}</h3>
        <Button variant="secondary" onClick={copy} className="print:hidden">
          {copied ? t.copied : t.copy}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">{t.emailSub}</p>
      <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-fg">
        {email}
      </pre>
    </Card>
  );
}

export function ActionPlanView({
  plan,
  sample = false,
  lang = "en",
}: {
  plan: ActionPlan;
  /** Read-only context (e.g. the public landing example): hides the print action. */
  sample?: boolean;
  /** Language for the static UI chrome (the plan content itself is already localized by the agent). */
  lang?: Lang;
}) {
  const matches = plan.matches ?? [];
  const flags = plan.flags ?? [];
  const t = T[lang];
  const mapPoints = mapPointsFor(matches);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-xs tracking-wide text-muted">
            {sample ? t.examplePlan : t.yourPlan}
          </span>
          <h2 className="mt-1 text-2xl tracking-tight">{t.planHeading}</h2>
        </div>
        {!sample ? (
          <Button
            variant="secondary"
            onClick={() => window.print()}
            className="print:hidden"
          >
            {t.print}
          </Button>
        ) : null}
      </div>

      {plan.situationSummary ? (
        <Card className="bg-surface-2">
          <p className="text-fg">{plan.situationSummary}</p>
        </Card>
      ) : null}

      {flags.length > 0 ? (
        <Card className="space-y-3">
          <p className="font-mono text-xs tracking-wide text-subtle">
            {t.pleaseNote}
          </p>
          {flags.map((flag) => {
            const info = FLAG_INFO[lang][flag];
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
          <MatchCard key={`${match.programId}-${i}`} match={match} lang={lang} />
        ))}
      </div>

      {mapPoints.length > 0 ? (
        <Card className="print:hidden">
          <h3 className="text-base font-medium">{t.helpNearYou}</h3>
          <p className="mt-1 text-sm text-muted">{t.helpNearYouSub}</p>
          <div className="mt-4">
            <HelpMap points={mapPoints} lang={lang} />
          </div>
        </Card>
      ) : null}

      <Checklist items={plan.checklist ?? []} lang={lang} />
      <DraftedEmail email={plan.draftedEmail ?? ""} lang={lang} />

      <p className="text-sm text-subtle">{t.footer}</p>
    </section>
  );
}
