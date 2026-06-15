/**
 * Shared types for Compass's optional long-term memory. The store (lib/db/queries.ts)
 * persists these; the extractor (extract.ts) proposes them; recall.ts formats them
 * into the agent's system prompt. All three backends (Groq + the Claude Agent SDK)
 * consume the recall block identically — memory is provider-agnostic by construction.
 */

/** The fixed taxonomy of what Compass may remember. Keep small and legible. */
export const MEMORY_KINDS = [
  "situation", // the gist of what they're dealing with
  "household", // who's affected (size, kids, etc.) — never names
  "need", // the kind of help they sought (food, utility, …)
  "progress", // which programs they're pursuing / where they are
  "preference", // language and how they like to be helped
] as const;

export type MemoryKind = (typeof MEMORY_KINDS)[number];

/** A minimized, durable fact — proposed by the extractor or returned from the store. */
export type MemoryItem = {
  kind: MemoryKind;
  /** Non-PII dedupe slug, e.g. "household.children". Re-saving the same key updates it. */
  key: string;
  /** Short non-PII label for the UI, e.g. "Household". */
  label: string;
  /** The fact itself — one short sentence, in the person's language (encrypted at rest). */
  content: string;
  /** UI hint only: render with extra care (health / finances / immigration). */
  sensitive: boolean;
};

/** A stored memory as returned to the management UI (content already decrypted). */
export type StoredMemory = MemoryItem & {
  id: string;
  updatedAt: Date;
};
