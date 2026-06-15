import "server-only";
import { listMemories } from "@/lib/db/queries";

/**
 * Build the memory block prepended to the agent's system prompt for a returning,
 * memory-enabled person. Returns null when there's nothing to recall (so the
 * prompt is unchanged for new users and for the guest /try demo).
 *
 * Provider-agnostic: this is plain prompt text, so the Groq backend and the Claude
 * Agent SDK backend both consume it identically with zero per-provider code.
 *
 * The framing is deliberately cautious — memory personalizes and avoids re-asking,
 * but it must never become a shortcut around the grounding rules. The model is told
 * memory may be stale and is NOT a basis for an eligibility verdict.
 */
export async function buildMemoryContext(
  userId: string,
  lang: "en" | "es",
): Promise<string | null> {
  const mems = await listMemories(userId);
  if (!mems.length) return null;

  const lines = mems.map((m) => `- (${m.kind}) ${m.content}`).join("\n");

  if (lang === "es") {
    return `MEMORIA (lo que recuerdas de esta persona, de sesiones anteriores y con su permiso):
${lines}

Usa la memoria para personalizar y evitar volver a preguntar lo que ya sabes. Puede estar desactualizada: confirma con tacto cualquier dato importante antes de basarte en él. La memoria NO determina elegibilidad — sigue usando search_programs y get_required_docs. No menciones identificadores; estos hechos ya están minimizados.`;
  }

  return `MEMORY (what you remember about this person, from earlier sessions and with their consent):
${lines}

Use memory to personalize and to avoid re-asking what you already know. It may be out of date — gently confirm anything important before relying on it. Memory does NOT decide eligibility — still use search_programs and get_required_docs. These facts are already minimized; do not surface raw identifiers.`;
}
