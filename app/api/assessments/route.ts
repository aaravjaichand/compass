import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import {
  isMemoryEnabled,
  saveAssessmentSnapshot,
  upsertMemories,
} from "@/lib/db/queries";
import { actionPlanSchema } from "@/lib/agent/schema";
import { extractMemories } from "@/lib/memory/extract";

export const runtime = "nodejs";

const MAX_BODY_CHARS = 60_000;

const bodySchema = z.object({
  conversationId: z.string().nullish(),
  transcript: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
      parts: z.array(z.unknown()).optional(),
    }),
  ),
  plan: actionPlanSchema.nullish(),
  language: z.enum(["en", "es"]).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  if (JSON.stringify(json).length > MAX_BODY_CHARS) {
    return new Response("Too large.", { status: 413 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new Response("Invalid body.", { status: 400 });

  const result = await saveAssessmentSnapshot({
    userId: user.id,
    conversationId: parsed.data.conversationId ?? null,
    transcript: parsed.data.transcript,
    plan: parsed.data.plan ?? null,
  });

  // Long-term memory: distill a few minimized, durable facts from this session so
  // a return visit is faster and warmer. Gated on the user's opt-in, only when a
  // plan exists, and fully best-effort — a failure here must never fail the save.
  if (parsed.data.plan) {
    try {
      if (await isMemoryEnabled(user.id)) {
        const items = await extractMemories({
          transcript: parsed.data.transcript,
          plan: parsed.data.plan,
          lang: parsed.data.language ?? "en",
        });
        await upsertMemories(user.id, items, result.conversationId);
      }
    } catch (error) {
      console.error("[assessments] memory extraction skipped", error);
    }
  }

  return Response.json(result);
}
