import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { addProgramStatus } from "@/lib/db/queries";

export const runtime = "nodejs";

const bodySchema = z.object({
  planId: z.string(),
  programId: z.string(),
  status: z.enum([
    "not_started",
    "gathering_docs",
    "submitted",
    "approved",
    "denied",
  ]),
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

  try {
    await addProgramStatus({ userId: user.id, ...parsed.data });
  } catch {
    return new Response("Plan not found.", { status: 404 });
  }
  return Response.json({ ok: true });
}
