import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { ALLOWED_TOOLS, DISALLOWED_TOOLS, compassServer } from "@/lib/agent/tools";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "claude-opus-4-8";
const MAX_BODY_CHARS = 24_000;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
});

type Block = Record<string, unknown>;

/** Flatten the useChat conversation into a role-labeled transcript prompt. */
function buildPrompt(messages: UIMessage[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const parts = (m.parts ?? []) as Array<{
      type: string;
      text?: string;
      data?: unknown;
    }>;
    const text =
      m.role === "user"
        ? parts
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("")
            .trim()
        : // assistant clarifying questions were stored as data-note parts
          parts
            .filter((p) => p.type === "data-note")
            .map((p) => String((p.data as { text?: string })?.text ?? ""))
            .join(" ")
            .trim();
    if (text) lines.push(`${m.role === "user" ? "User" : "Assistant"}: ${text}`);
  }
  return lines.join("\n\n");
}

/** Number of results in a tool_result payload (for the reasoning trace). */
function resultCount(content: unknown): number | undefined {
  try {
    let text = "";
    if (typeof content === "string") text = content;
    else if (Array.isArray(content)) {
      text = content
        .map((c) =>
          c && typeof c === "object" && "text" in c
            ? String((c as { text: unknown }).text)
            : "",
        )
        .join("");
    }
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.length : undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`agent:${ip}`).ok) {
    return new Response("Too many requests. Please wait a moment and try again.", {
      status: 429,
    });
  }

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
      // Correlate tool_use ids to their inputs so each step can be emitted with
      // its result count when the tool_result comes back.
      const pending = new Map<string, { name: string; input: unknown }>();
      let noteId = 0;

      for await (const message of query({
        prompt,
        options: {
          model,
          systemPrompt: SYSTEM_PROMPT,
          mcpServers: { compass: compassServer },
          allowedTools: ALLOWED_TOOLS,
          disallowedTools: DISALLOWED_TOOLS,
          permissionMode: "dontAsk",
          // Ignore project/user CLAUDE.md and settings — fully self-contained.
          settingSources: [],
          cwd,
          maxTurns: 12,
        },
      })) {
        if (message.type === "assistant") {
          const blocks = (message.message.content ?? []) as unknown as Block[];
          for (const block of blocks) {
            if (
              block.type === "text" &&
              typeof block.text === "string" &&
              block.text.trim()
            ) {
              writer.write({
                type: "data-note",
                id: `note-${noteId++}`,
                data: { text: block.text },
              });
            } else if (block.type === "tool_use") {
              const short = String(block.name ?? "").replace(/^mcp__compass__/, "");
              if (short === "present_action_plan") {
                writer.write({ type: "data-plan", data: block.input });
              } else {
                pending.set(String(block.id), { name: short, input: block.input });
              }
            }
          }
        } else if (message.type === "user") {
          const blocks = (message.message.content ?? []) as unknown as Block[];
          for (const block of blocks) {
            if (block.type === "tool_result") {
              const ref = pending.get(String(block.tool_use_id));
              if (ref) {
                writer.write({
                  type: "data-step",
                  id: String(block.tool_use_id),
                  data: {
                    name: ref.name,
                    input: ref.input,
                    count: resultCount(block.content),
                  },
                });
              }
            }
          }
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
