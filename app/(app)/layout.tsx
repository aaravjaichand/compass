import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getProfile } from "@/lib/db/queries";
import { FloatingNav } from "@/components/FloatingNav";
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

  // No sidebar: each section uses the full screen, and the floating pill
  // (FloatingNav) is the only persistent navigation chrome.
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <FloatingNav />
    </div>
  );
}
