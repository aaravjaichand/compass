import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { hasToolCall, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import {
  get_required_docs as lookupRequiredDocs,
  search_programs as searchPrograms,
} from "@/lib/directory/search";
import { actionPlanSchema } from "./schema";
import type { StreamWriter } from "./stream";

/**
 * Default Groq model. `openai/gpt-oss-120b` reliably drives the multi-step tool
 * loop and the nested final-plan schema on Groq's free tier (lighter models like
 * llama-3.3-70b fail the function call). Override via LLM_MODEL — `openai/gpt-oss-20b`
 * is a faster, lighter alternative that also completes the loop.
 */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

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
 * Groq-backed agent backend. Mirrors the Claude Agent SDK runner: same three
 * tools, same grounding, and it emits the SAME UI stream parts
 * (`data-note` / `data-step` / `data-plan`) so the client renders identically.
 *
 * Unlike the Anthropic path, this is a plain streaming fetch — no subprocess,
 * no Vercel Sandbox — so it runs on a normal serverless function and is the
 * default for the free demo. Needs GROQ_API_KEY.
 */
export async function runGroqAgent(opts: {
  writer: StreamWriter;
  prompt: string;
  systemPrompt: string;
  model: string;
  /** The data-* part type carrying the final plan (e.g. "data-plan"). */
  terminalPartType: string;
}): Promise<void> {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

  const tools = {
    search_programs: tool({
      description:
        "Search the Hudson/Bergen local-aid directory. Call this before recommending anything — you may ONLY use programs it returns. Call once per distinct need (e.g. utility help, then food).",
      inputSchema: z.object({
        needs: z
          .array(z.string())
          .optional()
          .describe("Short need phrases, e.g. ['utility shutoff', 'food']."),
        keywords: z
          .string()
          .optional()
          .describe("Free-text keywords from the person's own words."),
        category: categoryEnum.optional(),
        county: countyEnum
          .optional()
          .describe("Hudson for Jersey City; Bergen for Bergen towns."),
      }),
      // Minimal payload — only what the model needs to choose programs and
      // reason about eligibility. The UI renders phone/address/hours/docs from
      // the directory by id, so they're left out to stay well under the free
      // tier's tokens-per-minute limit (full records blow the budget per step).
      execute: async (args) =>
        searchPrograms(args).map((p) => ({
          id: p.id,
          name: p.name,
          org: p.org,
          category: p.category,
          summary: p.summary,
          eligibility: p.eligibility.summary,
          city: p.location.city,
          county: p.location.county,
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
    present_action_plan: tool({
      description:
        "Present the final, grounded action plan. Call this exactly once, last, after searching and gathering required documents. This is your final step.",
      inputSchema: actionPlanSchema,
      execute: async () => "Action plan presented to the user.",
    }),
  };

  const result = streamText({
    model: groq(opts.model),
    system: opts.systemPrompt,
    prompt: opts.prompt,
    tools,
    toolChoice: "auto",
    // Loop until the plan is presented (or a hard step cap), same as maxTurns.
    stopWhen: [stepCountIs(12), hasToolCall("present_action_plan")],
  });

  const pending = new Map<string, { name: string; input: unknown }>();
  let noteId = 0;
  let textBuf = "";

  const flushText = () => {
    const text = textBuf.trim();
    if (text) {
      opts.writer.write({
        type: "data-note",
        id: `note-${noteId++}`,
        data: { text },
      });
    }
    textBuf = "";
  };

  for await (const part of result.fullStream) {
    switch (part.type) {
      case "text-delta":
        textBuf += part.text;
        break;
      case "text-end":
        flushText();
        break;
      case "tool-call":
        flushText(); // flush any preamble text before the tool step renders
        if (part.toolName === "present_action_plan") {
          opts.writer.write({ type: opts.terminalPartType, data: part.input });
        } else {
          pending.set(part.toolCallId, {
            name: part.toolName,
            input: part.input,
          });
        }
        break;
      case "tool-result": {
        const ref = pending.get(part.toolCallId);
        if (ref) {
          const out = part.output;
          opts.writer.write({
            type: "data-step",
            id: part.toolCallId,
            data: {
              name: ref.name,
              input: ref.input,
              count: Array.isArray(out) ? out.length : undefined,
            },
          });
        }
        break;
      }
      case "error":
        throw part.error;
    }
  }
  flushText();
}
