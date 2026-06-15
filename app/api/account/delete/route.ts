import { auth, getCurrentUser } from "@/lib/auth/server";
import { deleteAllUserData } from "@/lib/db/queries";

export const runtime = "nodejs";

// Irreversible: purge all app rows, then delete the Neon Auth user account.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  await deleteAllUserData(user.id);

  try {
    await auth.deleteUser();
  } catch {
    // App data is already gone; surface a soft error so the user can retry the
    // account removal if the auth call failed.
    return new Response("Your data was deleted, but removing the account failed. Try again.", {
      status: 502,
    });
  }

  return Response.json({ ok: true });
}
