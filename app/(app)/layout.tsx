import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getProfile } from "@/lib/db/queries";
import { AppSidebar } from "@/components/AppSidebar";
import { SiteFooter } from "@/components/SiteFooter";

// Session + profile depend on cookies, so this shell must render dynamically.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // First-run users complete onboarding before reaching the app.
  const profile = await getProfile(user.id);
  if (!profile?.onboardingComplete) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <AppSidebar email={user.email ?? ""} />
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
