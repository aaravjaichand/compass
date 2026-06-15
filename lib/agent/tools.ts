import { tool } from "ai";
import { z } from "zod";
import {
  get_required_docs as lookupRequiredDocs,
  search_programs as searchPrograms,
} from "@/lib/directory/search";

const categoryEnum = z.enum([
  "food",
  "utility",
  "housing",
  "health",
  "cash",
  "childcare",
  "legal",
]);
const countyEnum = z.enum(["Hudson", "Bergen"]);

/**
 * The tools the agent may call. `search_programs` and `get_required_docs` are the
 * data seam; `present_action_plan` is a UI tool whose input IS the final plan,
 * so the structured result streams straight to the client.
 */
export const tools = {
  search_programs: tool({
    description:
      "Search the Hudson/Bergen local-aid directory. Call this before recommending anything — you may ONLY recommend programs it returns. Call it more than once for different needs.",
    inputSchema: z.object({
      needs: z
        .array(z.string())
        .optional()
        .describe("Short need phrases, e.g. ['utility shutoff', 'food']."),
      keywords: z
        .string()
        .optional()
        .describe("Free-text keywords drawn from the person's own words."),
      category: categoryEnum.optional(),
      county: countyEnum
        .optional()
        .describe("Use Hudson for Jersey City; Bergen for Bergen County towns."),
    }),
    execute: async (args) =>
      // Lean payload (no requiredDocs/source) so the agent must call
      // get_required_docs, which makes the reasoning trace richer.
      searchPrograms(args).map((p) => ({
        id: p.id,
        name: p.name,
        org: p.org,
        category: p.category,
        summary: p.summary,
        services: p.services,
        eligibility: p.eligibility,
        location: p.location,
        hours: p.hours,
        contact: p.contact,
      })),
  }),

  get_required_docs: tool({
    description:
      "Get the exact documents a specific program needs, by its id. Call this for every program you plan to include.",
    inputSchema: z.object({
      programId: z.string().describe("An id returned by search_programs."),
    }),
    execute: async ({ programId }) => lookupRequiredDocs({ programId }),
  }),
};
