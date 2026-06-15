import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  get_required_docs as lookupRequiredDocs,
  search_programs as searchPrograms,
} from "@/lib/directory/search";
import { actionPlanSchema } from "./schema";

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

const searchTool = tool(
  "search_programs",
  "Search the Hudson/Bergen local-aid directory. Call this before recommending anything — you may ONLY use programs it returns. Call once per distinct need (e.g. utility help, then food).",
  {
    needs: z
      .array(z.string())
      .optional()
      .describe("Short need phrases, e.g. ['utility shutoff', 'food']."),
    keywords: z
      .string()
      .optional()
      .describe("Free-text keywords from the person's own words."),
    category: categoryEnum.optional(),
    county: countyEnum.optional().describe("Hudson for Jersey City; Bergen for Bergen towns."),
  },
  async (args) => {
    // Lean payload (no requiredDocs/source) so the agent must call
    // get_required_docs, which makes the reasoning trace richer.
    const results = searchPrograms(args).map((p) => ({
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
    }));
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  },
);

const docsTool = tool(
  "get_required_docs",
  "Get the exact documents a specific program needs, by its id. Call this for every program you plan to include.",
  { programId: z.string().describe("An id returned by search_programs.") },
  async ({ programId }) => ({
    content: [
      { type: "text", text: JSON.stringify(lookupRequiredDocs({ programId })) },
    ],
  }),
);

const presentPlanTool = tool(
  "present_action_plan",
  "Present the final, grounded action plan. Call this exactly once, last, after searching and gathering required documents. This is your final step.",
  actionPlanSchema.shape,
  async () => ({
    content: [{ type: "text", text: "Action plan presented to the user." }],
  }),
);

export const compassServer = createSdkMcpServer({
  name: "compass",
  tools: [searchTool, docsTool, presentPlanTool],
});

/** Only these tools may run — everything else (shell, files, web) is denied. */
export const ALLOWED_TOOLS = [
  "mcp__compass__search_programs",
  "mcp__compass__get_required_docs",
  "mcp__compass__present_action_plan",
];

export const DISALLOWED_TOOLS = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "NotebookEdit",
  "TodoWrite",
];
