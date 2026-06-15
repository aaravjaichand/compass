import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { listConversations } from "@/lib/db/queries";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusDot, type Tone } from "@/components/ui/StatusDot";

export const dynamic = "force-dynamic";

const PLAN_STATUS: Record<string, { tone: Tone; label: string }> = {
  saved: { tone: "muted", label: "Saved" },
  in_progress: { tone: "warning", label: "In progress" },
  filed: { tone: "success", label: "Filed" },
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const conversations = user ? await listConversations(user.id) : [];
  const plans = conversations.filter((c) => c.planId);

  return (
    <div className="mx-auto w-full max-w-[1140px] px-6 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-xs tracking-wide text-muted">
            YOUR PLANS
          </span>
          <h1 className="mt-2 text-2xl tracking-tight">Saved action plans</h1>
          <p className="mt-1 text-sm text-muted">
            Everything you&apos;ve prepared. Nothing is ever submitted for you.
          </p>
        </div>
        <Link href="/assess">
          <Button>New assessment</Button>
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card className="mt-8 flex flex-col items-start gap-3">
          <p className="text-sm text-muted">
            You haven&apos;t saved a plan yet. Describe your situation and
            Compass will prepare one you can act on.
          </p>
          <Link href="/assess">
            <Button>Start an assessment</Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {plans.map((c) => {
            const s = PLAN_STATUS[c.planStatus ?? "saved"] ?? PLAN_STATUS.saved;
            return (
              <Link key={c.id} href={`/dashboard/${c.planId}`} className="block">
                <Card className="transition-colors duration-150 hover:bg-surface-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-medium">
                        {c.title ?? "Assessment"}
                      </h2>
                      {c.situationSummary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">
                          {c.situationSummary}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <StatusDot tone={s.tone} />
                      <span className="font-mono text-xs uppercase tracking-wide text-muted">
                        {s.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-subtle">
                    <span>
                      {c.programCount} program{c.programCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      Updated{" "}
                      {new Date(c.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
