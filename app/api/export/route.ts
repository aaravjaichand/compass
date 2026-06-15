import { getCurrentUser } from "@/lib/auth/server";
import { exportUserData } from "@/lib/db/queries";

export const runtime = "nodejs";

// Returns the user's full data (decrypted) as a downloadable JSON file.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const data = await exportUserData(user.id);
  const body = JSON.stringify(
    { exportedFor: user.email ?? user.id, data },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="compass-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
