import { packetSpecSchema } from "@/lib/packet/schema";
import { buildPacketPdf } from "@/lib/packet/pdf";
import { rateLimit } from "@/lib/rate-limit";
import { stackServerApp } from "@/stack/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_CHARS = 40_000;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`packet:${ip}`).ok) {
    return new Response("Too many requests. Please wait a moment and try again.", {
      status: 429,
    });
  }

  const user = await stackServerApp.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  const parsed = packetSpecSchema.safeParse(json);
  if (!parsed.success) {
    return new Response("Invalid packet.", { status: 400 });
  }
  if (JSON.stringify(parsed.data).length > MAX_BODY_CHARS) {
    return new Response("That packet is too large.", { status: 413 });
  }

  try {
    const bytes = await buildPacketPdf(parsed.data);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="compass-filing-packet.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[packet/pdf]", error);
    return new Response("Could not generate the packet. Please try again.", {
      status: 500,
    });
  }
}
