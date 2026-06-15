import { getCurrentUser } from "@/lib/auth/server";
import { clearMemories, listMemories } from "@/lib/db/queries";

export const runtime = "nodejs";

/** Everything Compass remembers about the signed-in person (decrypted). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const memories = await listMemories(user.id);
  return Response.json({ memories });
}

/** Forget everything ("clear all"). */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  await clearMemories(user.id);
  return Response.json({ ok: true });
}
