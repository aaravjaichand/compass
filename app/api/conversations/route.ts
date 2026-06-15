import { stackServerApp } from "@/stack/server";
import { listConversations } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const conversations = await listConversations(user.id);
  return Response.json({ conversations });
}
