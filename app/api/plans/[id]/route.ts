import { stackServerApp } from "@/stack/server";
import { getPlanById, listProgramStatus } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await stackServerApp.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const plan = await getPlanById(user.id, id);
  if (!plan) return new Response("Not found", { status: 404 });

  const status = await listProgramStatus(user.id, id);
  return Response.json({ plan, status });
}
