import { getCurrentUser } from "@/lib/auth/server";
import { deleteMemory } from "@/lib/db/queries";

export const runtime = "nodejs";

/** Forget a single memory (ownership-checked in the query). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  await deleteMemory(user.id, id);
  return Response.json({ ok: true });
}
