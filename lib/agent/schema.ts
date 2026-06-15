import { z } from "zod";

/** A single matched program with grounded reasoning. */
export const matchSchema = z.object({
  programId: z
    .string()
    .describe("The exact id of a program returned by search_programs."),
  matchReason: z
    .string()
    .describe("Plain-language reason this program fits the person's situation."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How confident the match is: high only when the situation clearly meets stated eligibility.",
    ),
  eligibility: z
    .string()
    .describe(
      "Rough eligibility, never a verdict: 'You likely qualify…', 'You may qualify…', or 'Unclear — confirm with the office', with a brief why.",
    ),
});

/** The full, grounded action plan the person receives. */
export const actionPlanSchema = z.object({
  situationSummary: z
    .string()
    .describe(
      "One or two plain-language sentences restating the person's situation so they feel understood.",
    ),
  matches: z
    .array(matchSchema)
    .describe("Matched programs, most relevant first. Only ids from search_programs."),
  checklist: z
    .array(z.string())
    .describe(
      "Deduplicated documents to gather across the matched programs, in plain language.",
    ),
  draftedEmail: z
    .string()
    .describe(
      "A short, polite, ready-to-adapt cover email (first person, with [bracketed] placeholders). It requests help and offers documents — it never submits anything.",
    ),
  flags: z
    .array(z.enum(["low_confidence", "minor_benefits", "cross_agency", "crisis"]))
    .describe("Responsible-AI flags that warrant a human's attention."),
});

export type PlanMatch = z.infer<typeof matchSchema>;
export type ActionPlan = z.infer<typeof actionPlanSchema>;
