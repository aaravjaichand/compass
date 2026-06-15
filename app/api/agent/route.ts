import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { PLAN_PROMPT, SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { actionPlanSchema } from "@/lib/agent/schema";
import { tools } from "@/lib/agent/tools";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Swappable, OpenAI-compatible provider — defaults to Groq's free tier.
// Structured outputs (json_schema) keep the assembled plan strictly on-schema.
const provider = createOpenAICompatible({
  name: "compass-llm",
  baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
  supportsStructuredOutputs: true,
});

// llama-4-scout drives the tool loop; gpt-oss-120b assembles the structured
// plan (a single, non-streaming call where it excels at on-schema JSON).
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_PLAN_MODEL = "openai/gpt-oss-120b";

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
});

const MAX_BODY_CHARS = 24_000;
const STREAM_ERROR =
  "Something went wrong reaching the assistant. Please try again in a moment.";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`agent:${ip}`).ok) {
    return new Response("Too many requests. Please wait a moment and try again.", {
      status: 429,
    });
  }

  if (!process.env.LLM_API_KEY) {
    return new Response(
      "The assistant isn't configured yet. Add LLM_API_KEY to run it.",
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response("Invalid request body.", { status: 400 });
  }

  const messages = parsed.data.messages as UIMessage[];
  if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
    return new Response("That message is too long. Please shorten it.", {
      status: 413,
    });
  }

  const model = provider(process.env.LLM_MODEL ?? DEFAULT_MODEL);
  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream({
    onError: (error) => {
      console.error("[agent] stream error:", error);
      return STREAM_ERROR;
    },
    execute: async ({ writer }) => {
      // 1) Reasoning loop with the simple directory tools — streamed live so
      //    the client can show the agent's steps.
      const result = streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(8),
      });
      writer.merge(result.toUIMessageStream());

      // 2) Collect the programs the agent actually found — this deduped list is
      //    the only thing the plan may cite (grounding) and a clean context for
      //    structured generation. If nothing was found, the agent only asked a
      //    clarifying question; stop and let that stream.
      const steps = await result.steps;
      const candidates = new Map<string, unknown>();
      for (const step of steps) {
        for (const tr of step.toolResults) {
          const r = tr as { toolName: string; output: unknown };
          if (r.toolName === "search_programs" && Array.isArray(r.output)) {
            for (const prog of r.output as Array<{ id?: string }>) {
              if (prog?.id) candidates.set(prog.id, prog);
            }
          }
        }
      }
      if (candidates.size === 0) return;

      // 3) Assemble the grounded plan with structured output.
      const planModel = provider(process.env.LLM_PLAN_MODEL ?? DEFAULT_PLAN_MODEL);
      const { object: plan } = await generateObject({
        model: planModel,
        schema: actionPlanSchema,
        system: PLAN_PROMPT,
        messages: [
          ...modelMessages,
          {
            role: "user",
            content: `Candidate programs found in the directory. Use ONLY these program ids in the plan:\n${JSON.stringify(
              [...candidates.values()],
            )}`,
          },
        ],
      });

      writer.write({ type: "data-plan", data: plan });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
