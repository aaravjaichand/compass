import { getCurrentUser } from "@/lib/auth/server";
import { getProfile } from "@/lib/db/queries";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <span className="font-mono text-xs tracking-wide text-muted">SETTINGS</span>
      <h1 className="mt-2 text-2xl tracking-tight">Your account</h1>
      <div className="mt-6">
        <SettingsClient
          email={user?.email ?? ""}
          initialProfile={profile?.data ?? {}}
          initialTheme={
            (profile?.theme as "light" | "dark" | "system") ?? "system"
          }
          initialMemoryEnabled={profile?.memoryEnabled ?? false}
        />
      </div>
    </div>
  );
}
