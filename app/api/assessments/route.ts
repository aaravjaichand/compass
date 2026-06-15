import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { saveAssessmentSnapshot } from "@/lib/db/queries";
import { actionPlanSchema } from "@/lib/agent/schema";

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
  return Response.json(result);
}
