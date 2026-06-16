import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getPlanById,
  getLatestPacketForPlan,
  listProgramStatus,
} from "@/lib/db/queries";
import { ActionPlanView } from "@/components/ActionPlanView";
import { ProgramStatusControl } from "@/components/ProgramStatusControl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getProgramById } from "@/lib/directory/search";
import type { ActionPlan } from "@/lib/agent/schema";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const plan = await getPlanById(user.id, planId);
  if (!plan) notFound();

  const ap = plan.planJson as ActionPlan;
  const statusRows = await listProgramStatus(user.id, planId);
  const hasPacket = Boolean(await getLatestPacketForPlan(user.id, planId));

  // Latest recorded status per program (rows are newest-first).
  const latestByProgram = new Map<string, string>();
  for (const r of statusRows) {
    if (!latestByProgram.has(r.programId)) latestByProgram.set(r.programId, r.status);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="font-mono text-xs text-muted transition-colors duration-150 hover:text-fg"
        >
          ← All plans
        </Link>
        {hasPacket ? (
          <a href={`/api/plans/${planId}/packet`}>
            <Button variant="secondary">Download packet</Button>
          </a>
        ) : null}
      </div>

      <div className="mt-6">
        <ActionPlanView plan={ap} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg tracking-tight">Application status</h2>
        <p className="mt-1 text-sm text-muted">
          Track where you are with each program.{" "}
          <span className="text-subtle">
            Compass does not contact agencies or track your applications. This
            is what you record for yourself.
          </span>
        </p>
        <div className="mt-4 space-y-3">
          {(ap.matches ?? []).map((m) => {
            const program = getProgramById(m.programId);
            if (!program) return null;
            return (
              <Card
                key={m.programId}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-sm font-medium">{program.name}</span>
                <ProgramStatusControl
                  planId={planId}
                  programId={m.programId}
                  current={latestByProgram.get(m.programId) ?? "not_started"}
                />
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
