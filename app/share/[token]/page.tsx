import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionPlanView, type Lang } from "@/components/ActionPlanView";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSharedPlan } from "@/lib/db/queries";
import type { ActionPlan } from "@/lib/agent/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A shared plan · Compass",
  robots: { index: false },
};

const BANNER: Record<Lang, string> = {
  en: "Shared with you so you can help file. Compass prepared this plan — nothing has been submitted to any agency.",
  es: "Te compartieron esto para que ayudes a presentarlo. Compass preparó este plan — no se ha enviado nada a ninguna agencia.",
};

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await getSharedPlan(token);
  if (!shared) notFound();

  const plan = shared.plan as ActionPlan;
  const lang: Lang = shared.lang === "es" ? "es" : "en";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="mb-6 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            {BANNER[lang]}
          </div>
          <ActionPlanView plan={plan} lang={lang} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
