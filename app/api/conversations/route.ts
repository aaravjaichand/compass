import { getCurrentUser } from "@/lib/auth/server";
import { listConversations } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const conversations = await listConversations(user.id);
  return Response.json({ conversations });
}
