import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { upsertProfile } from "@/lib/db/queries";

export const runtime = "nodejs";

const bodySchema = z.object({
  data: z.record(z.string(), z.string()).optional(),
  county: z.string().optional(),
  memoryEnabled: z.boolean().optional(),
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new Response("Invalid body.", { status: 400 });

  await upsertProfile(user.id, { ...parsed.data, onboardingComplete: true });
  return Response.json({ ok: true });
}
