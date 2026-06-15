import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { GROQ_DEFAULT_MODEL } from "@/lib/agent/groq";
import { getProgramById } from "@/lib/directory/search";
import type { ActionPlan } from "@/lib/agent/schema";
import { MEMORY_KINDS, type MemoryItem } from "./types";

type Lang = "en" | "es";
type Turn = { role: "user" | "assistant"; text: string };

/**
 * Turn a finished assess session into a few durable, MINIMIZED facts worth
 * remembering for next time. Two layers, merged:
 *
 *  1. Deterministic facts derived from the grounded plan (always run, no LLM).
 *     These never contain identity PII — the situationSummary is already a
 *     non-PII restatement and program ids/categories are public directory data.
 *  2. An optional LLM pass that reads the transcript for narrative facts the plan
 *     can't capture (household size, who's affected, language). Best-effort: if it
 *     fails or is unconfigured, layer 1 still gives a useful memory.
 *
 * The extractor is the single chokepoint where minimization is enforced, so a
 * leak here can't reach the store. The LLM is told the rules AND its output is
 * re-scrubbed below.
 */
export async function extractMemories(opts: {
  transcript: Turn[];
  plan: ActionPlan | null;
  lang: Lang;
}): Promise<MemoryItem[]> {
  const deterministic = fromPlan(opts.plan, opts.lang);
  const llm = await fromTranscript(opts).catch(() => [] as MemoryItem[]);

  // Deterministic facts win on key collisions; cap to keep the recall block small.
  const byKey = new Map<string, MemoryItem>();
  for (const m of [...deterministic, ...llm]) {
    if (!byKey.has(m.key)) byKey.set(m.key, m);
  }
  return [...byKey.values()].filter(isClean).slice(0, 8);
}

// ----------------------------------------------------------- layer 1: the plan

const NEED_LABEL: Record<string, { en: string; es: string }> = {
  food: { en: "food assistance", es: "ayuda con comida" },
  utility: { en: "utility help", es: "ayuda con servicios" },
  housing: { en: "housing help", es: "ayuda con vivienda" },
  health: { en: "health services", es: "servicios de salud" },
  cash: { en: "cash assistance", es: "asistencia económica" },
  childcare: { en: "child care help", es: "ayuda con cuidado infantil" },
  legal: { en: "legal aid", es: "ayuda legal" },
};

function fromPlan(plan: ActionPlan | null, lang: Lang): MemoryItem[] {
  if (!plan) return [];
  const items: MemoryItem[] = [];

  if (plan.situationSummary?.trim()) {
    items.push({
      kind: "situation",
      key: "situation.latest",
      label: lang === "es" ? "Situación" : "Situation",
      content: plan.situationSummary.trim(),
      sensitive: false,
    });
  }

  // Needs, from the categories of the matched programs (public directory data).
  const cats = new Set<string>();
  const names = new Set<string>();
  for (const m of plan.matches ?? []) {
    const prog = getProgramById(m.programId);
    prog?.category?.forEach((c) => cats.add(c));
    if (prog) names.add(prog.name);
  }
  for (const c of cats) {
    const phrase = NEED_LABEL[c]?.[lang];
    if (!phrase) continue;
    items.push({
      kind: "need",
      key: `need.${c}`,
      label: lang === "es" ? "Necesidad reciente" : "Recent need",
      content:
        lang === "es" ? `Buscó ${phrase}.` : `Looked for ${phrase}.`,
      sensitive: false,
    });
  }

  if (names.size) {
    const list = [...names].slice(0, 4).join(", ");
    items.push({
      kind: "progress",
      key: "progress.programs",
      label: lang === "es" ? "En proceso" : "In progress",
      content:
        lang === "es" ? `Considerando: ${list}.` : `Pursuing: ${list}.`,
      sensitive: false,
    });
  }

  if (lang === "es") {
    items.push({
      kind: "preference",
      key: "preference.language",
      label: "Idioma",
      content: "Prefiere recibir ayuda en español.",
      sensitive: false,
    });
  }

  return items;
}

// ------------------------------------------------------ layer 2: the transcript

const itemSchema = z.object({
  kind: z.enum(MEMORY_KINDS),
  key: z
    .string()
    .describe("A stable lowercase slug, e.g. 'household.children'."),
  label: z.string().describe("A 1-2 word non-PII label, e.g. 'Household'."),
  content: z
    .string()
    .describe("One short sentence, in the person's language. No identifiers."),
  sensitive: z.boolean(),
});
const extractionSchema = z.object({ memories: z.array(itemSchema).max(6) });

const EXTRACTION_SYSTEM = `You distill a short support-assistance conversation into a few durable facts that would help the assistant help this SAME person faster next time.

Return at most 6 facts. Each is one short sentence in the person's language. Prefer general, lasting facts over one-off details.

HARD privacy rules — these override everything:
- NEVER include a person's name, date of birth, SSN/ITIN, account, case, or phone numbers, email, or exact street address.
- Do not record anything about self-harm, abuse, or danger.
- Record situational facts only: household makeup (e.g. "Has two young children"), who is affected, the kind of hardship, language preference, and which programs they are pursuing.
- If nothing durable and safe is worth keeping, return an empty list.

Mark sensitive=true when a fact touches health, disability, immigration status, or finances.`;

function buildExtractionPrompt(t: Turn[], plan: ActionPlan | null, lang: Lang) {
  const convo = t
    .map((m) => `${m.role === "user" ? "Person" : "Compass"}: ${m.text}`)
    .join("\n")
    .slice(0, 6000);
  const summary = plan?.situationSummary ? `\n\nPlan summary: ${plan.situationSummary}` : "";
  const langLine =
    lang === "es" ? "Write each fact in Spanish." : "Write each fact in English.";
  return `${langLine}\n\nConversation:\n${convo}${summary}`;
}

async function fromTranscript(opts: {
  transcript: Turn[];
  plan: ActionPlan | null;
  lang: Lang;
}): Promise<MemoryItem[]> {
  if (!process.env.GROQ_API_KEY) return [];
  const userText = opts.transcript
    .filter((m) => m.role === "user")
    .map((m) => m.text)
    .join(" ")
    .trim();
  if (userText.length < 12) return []; // nothing substantive to mine

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const { object } = await generateObject({
    model: groq(process.env.MEMORY_MODEL || GROQ_DEFAULT_MODEL),
    schema: extractionSchema,
    system: EXTRACTION_SYSTEM,
    prompt: buildExtractionPrompt(opts.transcript, opts.plan, opts.lang),
  });
  return object.memories.map((m) => ({
    kind: m.kind,
    key: slug(m.key),
    label: m.label.slice(0, 40),
    content: m.content.trim().slice(0, 240),
    sensitive: Boolean(m.sensitive),
  }));
}

// --------------------------------------------------------------- minimization

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 48) || "fact"
  );
}

// Belt-and-suspenders scrub: drop any item whose content still looks like a raw
// identifier, even if the model ignored the rules above.
const PII_PATTERNS: RegExp[] = [
  /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN / ITIN
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // date of birth
  /\b\d[\d\s-]{7,}\d\b/, // long digit runs (account / phone)
  /[\w.+-]+@[\w-]+\.[\w.-]+/, // email
  /\b\d+\s+[A-Z][a-z]+\s+(st|street|ave|avenue|rd|road|blvd|lane|ln|dr|drive)\b/i, // street address
];

/**
 * True if content still looks like a raw identifier we must never persist. The
 * last line of defense behind the extractor's prompt rules — exported so the
 * minimization guarantee is directly testable.
 */
export function containsRawIdentifier(content: string): boolean {
  return PII_PATTERNS.some((re) => re.test(content));
}

function isClean(m: MemoryItem): boolean {
  return Boolean(m.content?.trim()) && !containsRawIdentifier(m.content);
}
