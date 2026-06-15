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
import { GROQ_DEFAULT_MODEL, runGroqAgent } from "@/lib/agent/groq";
import { getCurrentUser } from "@/lib/auth/server";
import { isMemoryEnabled } from "@/lib/db/queries";
import { buildMemoryContext } from "@/lib/memory/recall";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// The Anthropic backend runs in a Vercel Sandbox (install + multi-turn reasoning),
// which exceeds 60s. The Groq backend is a plain streaming fetch and returns fast.
// Requires Fluid Compute enabled; the effective cap is the plan's.
export const maxDuration = 300;

const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_BODY_CHARS = 24_000;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
  language: z.enum(["en", "es"]).optional(),
});

/** A Claude model id routes to Anthropic; anything else (llama-*,
 *  openai/gpt-oss-*, moonshotai/*, …) routes to Groq. */
function isAnthropicModel(model: string): boolean {
  return /^(claude|anthropic|us\.anthropic)/i.test(model);
}

/**
 * One knob: LLM_MODEL. The model name alone picks the backend and which key is
 * used — a Claude model uses the Anthropic key; any other model uses the Groq
 * key. If LLM_MODEL is unset, default to whichever provider has a key configured
 * (Groq first, since it's the free demo backend).
 */
function resolveBackend():
  | { provider: "groq" | "anthropic"; model: string }
  | { error: string } {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasAnthropic = Boolean(
    process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY,
  );
  const model =
    process.env.LLM_MODEL?.trim() ||
    (hasGroq ? GROQ_DEFAULT_MODEL : ANTHROPIC_DEFAULT_MODEL);
  const provider = isAnthropicModel(model) ? "anthropic" : "groq";

  if (provider === "groq" && !hasGroq) {
    return { error: `set GROQ_API_KEY — LLM_MODEL="${model}" is a Groq model.` };
  }
  if (provider === "anthropic" && !hasAnthropic) {
    return {
      error: `set an Anthropic key — LLM_MODEL="${model}" is a Claude model.`,
    };
  }
  return { provider, model };
}

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

  const backend = resolveBackend();
  if ("error" in backend) {
    return new Response(`The assistant isn't configured: ${backend.error}`, {
      status: 503,
    });
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

  // When the user picks Spanish, steer the agent's entire output to Spanish
  // (the LANGUAGE rule in SYSTEM_PROMPT does the rest).
  const languageDirective =
    parsed.data.language === "es"
      ? "The person is using Spanish. Write the entire plan and every message in Spanish.\n\n"
      : "";

  // Personalize for a returning, memory-enabled person. Guests (the public /try
  // demo) have no session, so this resolves to null and the prompt is unchanged.
  // Best-effort: any auth/db hiccup must never break the assistant.
  let memoryBlock: string | null = null;
  try {
    const user = await getCurrentUser();
    if (user && (await isMemoryEnabled(user.id))) {
      memoryBlock = await buildMemoryContext(
        user.id,
        parsed.data.language ?? "en",
      );
    }
  } catch (error) {
    console.error("[agent] memory recall skipped", error);
  }

  const systemPrompt = `Today's date is ${todayInET()} (Eastern Time).\n\n${languageDirective}${
    memoryBlock ? `${memoryBlock}\n\n` : ""
  }${SYSTEM_PROMPT}`;

  const stream = createUIMessageStream({
    onError: (error) => {
      console.error("[agent]", error);
      return "Something went wrong reaching the assistant. Please try again in a moment.";
    },
    execute: async ({ writer }) => {
      // Groq backend: a plain streaming fetch, no sandbox — the free-demo default.
      if (backend.provider === "groq") {
        await runGroqAgent({
          writer,
          prompt,
          systemPrompt,
          model: backend.model,
          terminalPartType: "data-plan",
        });
        return;
      }
      // Anthropic backend: the Claude Agent SDK (in-process locally, Sandbox on Vercel).
      await runAgent({
        writer,
        prompt,
        systemPrompt,
        model: backend.model,
        mcpServers: { compass: compassServer },
        allowedTools: ALLOWED_TOOLS,
        disallowedTools: DISALLOWED_TOOLS,
        cwd: mkdtempSync(join(tmpdir(), "compass-")),
        terminalToolName: "present_action_plan",
        terminalPartType: "data-plan",
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
