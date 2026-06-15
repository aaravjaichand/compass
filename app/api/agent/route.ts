import {
  convertToModelMessages,
  hasToolCall,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { tools } from "@/lib/agent/tools";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Swappable, OpenAI-compatible provider — defaults to Groq's free tier.
const provider = createOpenAICompatible({
  name: "compass-llm",
  baseURL: process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
});

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
});

const MAX_BODY_CHARS = 24_000;

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

  const model = provider(process.env.LLM_MODEL ?? "llama-3.3-70b-versatile");
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    // Bound the loop and end right after the plan is presented.
    stopWhen: [stepCountIs(10), hasToolCall("present_action_plan")],
  });

  return result.toUIMessageStreamResponse({
    onError: () =>
      "Something went wrong reaching the assistant. Please try again in a moment.",
  });
}
