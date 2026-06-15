import { type UIMessage } from "ai";
import { query } from "@anthropic-ai/claude-agent-sdk";

type Block = Record<string, unknown>;

type QueryOptions = NonNullable<Parameters<typeof query>[0]["options"]>;

/** Current date in NJ (Eastern) time, e.g. "Monday, June 15, 2026". The Agent
 * SDK doesn't tell the model what day it is, so routes inject this into the
 * system prompt for date/deadline reasoning. */
export function todayInET(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/** Minimal surface of the `ai` stream writer the loop needs. Method syntax keeps
 * the parameter bivariant so the concrete `ai` writer stays assignable. */
type StreamWriter = { write(part: Record<string, unknown>): void };

/** Flatten the useChat conversation into a role-labeled transcript prompt. */
export function buildPrompt(messages: UIMessage[]): string {
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
export function resultCount(content: unknown): number | undefined {
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

export type RunAgentStreamOptions = {
  writer: StreamWriter;
  prompt: string;
  systemPrompt: string;
  model: string;
  mcpServers: QueryOptions["mcpServers"];
  allowedTools: string[];
  disallowedTools: string[];
  cwd: string;
  maxTurns?: number;
  /** Short tool name (no mcp prefix) whose input is the final payload. */
  terminalToolName: string;
  /** The data-* part type emitted carrying the terminal tool's input. */
  terminalPartType: string;
};

/**
 * Drive one Claude Agent SDK turn-loop, translating its message stream into the
 * UI part types the client renders: `data-note` (assistant text), `data-step`
 * (a completed tool call + result count), and one terminal `data-*` part whose
 * payload is the terminal tool's input (e.g. present_action_plan -> data-plan,
 * assemble_packet -> data-packet).
 */
export async function runAgentStream(opts: RunAgentStreamOptions): Promise<void> {
  const { writer, terminalToolName, terminalPartType } = opts;
  // Correlate tool_use ids to their inputs so each step can be emitted with its
  // result count when the tool_result comes back.
  const pending = new Map<string, { name: string; input: unknown }>();
  let noteId = 0;

  for await (const message of query({
    prompt: opts.prompt,
    options: {
      model: opts.model,
      systemPrompt: opts.systemPrompt,
      mcpServers: opts.mcpServers,
      allowedTools: opts.allowedTools,
      disallowedTools: opts.disallowedTools,
      permissionMode: "dontAsk",
      // Ignore project/user CLAUDE.md and settings — fully self-contained.
      settingSources: [],
      cwd: opts.cwd,
      maxTurns: opts.maxTurns ?? 12,
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
          const short = String(block.name ?? "").replace(/^mcp__[a-z0-9-]+__/i, "");
          if (short === terminalToolName) {
            writer.write({ type: terminalPartType, data: block.input });
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
}
