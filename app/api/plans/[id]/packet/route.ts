import { getCurrentUser } from "@/lib/auth/server";
import { getLatestPacketForPlan } from "@/lib/db/queries";
import { buildPacketPdf } from "@/lib/packet/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

// Regenerate a saved plan's PDF packet on demand from the stored (encrypted) spec.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const spec = await getLatestPacketForPlan(user.id, id);
  if (!spec) return new Response("No packet for this plan yet.", { status: 404 });

  const bytes = await buildPacketPdf(spec);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="compass-filing-packet.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
