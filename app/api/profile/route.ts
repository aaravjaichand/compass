import { z } from "zod";
import { stackServerApp } from "@/stack/server";
import { getProfile, upsertProfile } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const profile = await getProfile(user.id);
  return Response.json({
    profile: profile ?? {
      data: {},
      county: null,
      onboardingComplete: false,
      theme: "system",
    },
  });
}

const bodySchema = z.object({
  data: z.record(z.string(), z.string()).optional(),
  county: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  onboardingComplete: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await stackServerApp.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new Response("Invalid body.", { status: 400 });

  await upsertProfile(user.id, parsed.data);
  return Response.json({ ok: true });
}
