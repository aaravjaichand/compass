import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { buildPrompt, runAgentStream, todayInET } from "@/lib/agent/stream";
import { DISALLOWED_TOOLS } from "@/lib/agent/tools";
import {
  compassIntakeServer,
  INTAKE_ALLOWED_TOOLS,
} from "@/lib/agent/intake-tools";
import {
  buildIntakePrompt,
  type IntakeProgramContext,
} from "@/lib/agent/intake-prompt";
import { computeRequiredFields } from "@/lib/packet/assemble";
import { TEMPLATE_BY_ID } from "@/lib/packet/templates";
import { getProgramById } from "@/lib/directory/search";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_BODY_CHARS = 24_000;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(40),
  programIds: z.array(z.string()).min(1).max(12),
  situation: z.string().max(4_000).optional(),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`intake:${ip}`).ok) {
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
  const programIds = parsed.data.programIds;
  if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
    return new Response("That message is too long. Please shorten it.", {
      status: 413,
    });
  }

  // Resolve display + letter framing for each chosen program (server-authoritative).
  const programs: IntakeProgramContext[] = programIds
    .map((id) => {
      const program = getProgramById(id);
      if (!program) return null;
      const framing =
        TEMPLATE_BY_ID[id]?.letterFraming ?? "apply for this program";
      return { id, name: program.name, org: program.org, framing };
    })
    .filter((p): p is IntakeProgramContext => p !== null);

  const requiredFields = computeRequiredFields(programIds);
  const systemPrompt = `Today's date is ${todayInET()} (Eastern Time).\n\n${buildIntakePrompt(
    programs,
    requiredFields,
    parsed.data.situation,
  )}`;

  const prompt = buildPrompt(messages);
  const model = process.env.LLM_MODEL ?? DEFAULT_MODEL;
  const cwd = mkdtempSync(join(tmpdir(), "compass-intake-"));

  const stream = createUIMessageStream({
    onError: (error) => {
      console.error("[intake]", error);
      return "Something went wrong reaching the assistant. Please try again in a moment.";
    },
    execute: async ({ writer }) => {
      await runAgentStream({
        writer,
        prompt,
        systemPrompt,
        model,
        mcpServers: { "compass-intake": compassIntakeServer },
        allowedTools: INTAKE_ALLOWED_TOOLS,
        disallowedTools: DISALLOWED_TOOLS,
        cwd,
        terminalToolName: "assemble_packet",
        terminalPartType: "data-packet",
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
