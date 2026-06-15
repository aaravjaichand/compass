import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { ALLOWED_TOOLS, DISALLOWED_TOOLS, compassServer } from "@/lib/agent/tools";
import { buildPrompt, todayInET } from "@/lib/agent/stream";
import { runAgent } from "@/lib/agent/runtime";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// The agent runs in a Vercel Sandbox (install + multi-turn reasoning), which
// exceeds 60s. Requires Fluid Compute enabled; the effective cap is the plan's.
export const maxDuration = 300;

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_BODY_CHARS = 24_000;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`agent:${ip}`).ok) {
    return new Response("Too many requests. Please wait a moment and try again.", {
      status: 429,
    });
  }

  // No auth gate: the public `/try` demo calls this endpoint as a guest. The
  // agent reads only the bundled directory and never touches user data, so an
  // unauthenticated run is safe; abuse is bounded by the IP rate-limit above.

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN && !process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "The assistant isn't configured yet. Set CLAUDE_CODE_OAUTH_TOKEN.",
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

  const prompt = buildPrompt(messages);
  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL;
  const cwd = mkdtempSync(join(tmpdir(), "compass-"));

  const stream = createUIMessageStream({
    onError: (error) => {
      console.error("[agent]", error);
      return "Something went wrong reaching the assistant. Please try again in a moment.";
    },
    execute: async ({ writer }) => {
      await runAgent({
        writer,
        prompt,
        systemPrompt: `Today's date is ${todayInET()} (Eastern Time).\n\n${SYSTEM_PROMPT}`,
        model,
        mcpServers: { compass: compassServer },
        allowedTools: ALLOWED_TOOLS,
        disallowedTools: DISALLOWED_TOOLS,
        cwd,
        terminalToolName: "present_action_plan",
        terminalPartType: "data-plan",
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
