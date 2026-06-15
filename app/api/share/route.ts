import { z } from "zod";
import { actionPlanSchema } from "@/lib/agent/schema";
import { createSharedPlan } from "@/lib/db/queries";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_CHARS = 40_000;

const bodySchema = z.object({
  plan: actionPlanSchema,
  lang: z.enum(["en", "es"]).optional(),
});

/**
 * Mint a public, read-only share link for a plan. No auth: this also serves the
 * guest `/try` demo, and the stored plan is non-PII. Abuse is bounded by the
 * per-IP rate limit, a body-size cap, and strict schema validation.
 */
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`share:${ip}`).ok) {
    return new Response("Too many requests. Please wait a moment and try again.", {
      status: 429,
    });
  }

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
  if (!parsed.success) {
    return new Response("Invalid body.", { status: 400 });
  }

  const token = await createSharedPlan(parsed.data.plan, parsed.data.lang ?? "en");
  return Response.json({ token });
}
