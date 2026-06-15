import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  conversations,
  messages,
  packets,
  plans,
  profiles,
  programStatus,
} from "./schema";
import { decrypt, decryptJson, encrypt, encryptJson } from "@/lib/crypto";
import { getProgramById } from "@/lib/directory/search";
import type { ActionPlan } from "@/lib/agent/schema";
import type { PacketSpec } from "@/lib/packet/schema";

/** field id -> value, the decrypted profile shape (matches lib/packet/fields.ts ids). */
export type ProfileData = Record<string, string>;

// ---------------------------------------------------------------- profiles

export async function getProfile(userId: string): Promise<{
  data: ProfileData;
  county: string | null;
  onboardingComplete: boolean;
  theme: string;
} | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    data: row.encProfile ? decryptJson<ProfileData>(row.encProfile) : {},
    county: row.county,
    onboardingComplete: row.onboardingComplete,
    theme: row.theme,
  };
}

export async function upsertProfile(
  userId: string,
  patch: {
    data?: ProfileData;
    county?: string;
    theme?: string;
    onboardingComplete?: boolean;
  },
): Promise<void> {
  const db = getDb();
  const set: Record<string, unknown> = {};
  if (patch.data !== undefined) set.encProfile = encryptJson(patch.data);
  if (patch.county !== undefined) set.county = patch.county;
  if (patch.theme !== undefined) set.theme = patch.theme;
  if (patch.onboardingComplete !== undefined)
    set.onboardingComplete = patch.onboardingComplete;

  await db
    .insert(profiles)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: profiles.userId, set });
}

// ------------------------------------------------------- assessments / plans

/** Non-PII title derived from matched program categories (never raw user words). */
function deriveTitle(plan: ActionPlan): string {
  const cats = new Set<string>();
  for (const m of plan.matches ?? []) {
    getProgramById(m.programId)?.category?.forEach((c) => cats.add(c));
  }
  const labels = [...cats].slice(0, 3).join(", ");
  if (!labels) return "Assessment";
  return `${labels[0].toUpperCase()}${labels.slice(1)} assistance`;
}

export type TranscriptItem = {
  role: "user" | "assistant";
  text: string;
  parts?: unknown[];
};

/**
 * Persist a full assess-session snapshot: create the conversation on first save
 * (else verify ownership), replace its transcript with the encrypted messages,
 * and upsert the latest plan. Returns the conversation + plan ids so the client
 * can thread them across turns and into the packet step. Replacing the whole
 * transcript each save keeps it idempotent for short crisis conversations.
 */
export async function saveAssessmentSnapshot(opts: {
  userId: string;
  conversationId: string | null;
  transcript: TranscriptItem[];
  plan: ActionPlan | null;
}): Promise<{ conversationId: string; planId: string | null }> {
  const db = getDb();
  let conversationId = opts.conversationId;

  if (!conversationId) {
    const [row] = await db
      .insert(conversations)
      .values({
        userId: opts.userId,
        title: opts.plan ? deriveTitle(opts.plan) : "Assessment",
        situationSummary: opts.plan?.situationSummary ?? null,
        status: "active",
      })
      .returning({ id: conversations.id });
    conversationId = row.id;
  } else {
    const [owned] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, opts.userId),
        ),
      )
      .limit(1);
    if (!owned) throw new Error("Conversation not found");
    if (opts.plan) {
      await db
        .update(conversations)
        .set({
          title: deriveTitle(opts.plan),
          situationSummary: opts.plan.situationSummary,
        })
        .where(eq(conversations.id, conversationId));
    }
  }

  const cid = conversationId;
  await db.delete(messages).where(eq(messages.conversationId, cid));
  if (opts.transcript.length) {
    await db.insert(messages).values(
      opts.transcript.map((m, i) => ({
        conversationId: cid,
        userId: opts.userId,
        role: m.role,
        encContent: m.text ? encrypt(m.text) : null,
        partsJson: m.parts ?? null,
        seq: i,
      })),
    );
  }

  let planId: string | null = null;
  if (opts.plan) {
    const [existingPlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.conversationId, cid), eq(plans.userId, opts.userId)))
      .limit(1);
    if (existingPlan) {
      await db
        .update(plans)
        .set({ planJson: opts.plan })
        .where(eq(plans.id, existingPlan.id));
      planId = existingPlan.id;
    } else {
      const [row] = await db
        .insert(plans)
        .values({
          userId: opts.userId,
          conversationId: cid,
          planJson: opts.plan,
          status: "saved",
        })
        .returning({ id: plans.id });
      planId = row.id;
    }
  }

  return { conversationId: cid, planId };
}

export type ConversationSummary = {
  id: string;
  title: string | null;
  status: string;
  situationSummary: string | null;
  updatedAt: Date;
  planId: string | null;
  planStatus: string | null;
  programCount: number;
};

export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const db = getDb();
  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));

  const planRows = await db
    .select()
    .from(plans)
    .where(eq(plans.userId, userId));
  const planByConvo = new Map<string, (typeof planRows)[number]>();
  for (const p of planRows) if (p.conversationId) planByConvo.set(p.conversationId, p);

  return convos.map((c) => {
    const plan = planByConvo.get(c.id);
    const ap = plan?.planJson as ActionPlan | undefined;
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      situationSummary: c.situationSummary,
      updatedAt: c.updatedAt,
      planId: plan?.id ?? null,
      planStatus: plan?.status ?? null,
      programCount: ap?.matches?.length ?? 0,
    };
  });
}

export async function getPlanById(userId: string, planId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .limit(1);
  return row ?? null;
}

// -------------------------------------------------------------- packets

export async function savePacket(opts: {
  userId: string;
  planId: string | null;
  spec: PacketSpec;
}): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(packets)
    .values({
      userId: opts.userId,
      planId: opts.planId,
      programIds: opts.spec.programIds,
      encPacket: encryptJson({
        intakeAnswers: opts.spec.intakeAnswers,
        coverLetter: opts.spec.coverLetter,
      }),
    })
    .returning({ id: packets.id });
  return row.id;
}

export async function getLatestPacketForPlan(
  userId: string,
  planId: string,
): Promise<PacketSpec | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(packets)
    .where(and(eq(packets.planId, planId), eq(packets.userId, userId)))
    .orderBy(desc(packets.createdAt))
    .limit(1);
  if (!row) return null;
  const dec = decryptJson<{
    intakeAnswers: Record<string, string>;
    coverLetter: string;
  }>(row.encPacket);
  return {
    programIds: row.programIds,
    intakeAnswers: dec.intakeAnswers,
    coverLetter: dec.coverLetter,
  };
}

// ----------------------------------------------------- per-program status

export async function addProgramStatus(opts: {
  userId: string;
  planId: string;
  programId: string;
  status: string;
}): Promise<void> {
  const db = getDb();
  // Ownership: the plan must belong to the user.
  const [owned] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.id, opts.planId), eq(plans.userId, opts.userId)))
    .limit(1);
  if (!owned) throw new Error("Plan not found");
  await db.insert(programStatus).values({
    userId: opts.userId,
    planId: opts.planId,
    programId: opts.programId,
    status: opts.status,
  });
}

export async function listProgramStatus(userId: string, planId: string) {
  const db = getDb();
  return db
    .select()
    .from(programStatus)
    .where(
      and(eq(programStatus.planId, planId), eq(programStatus.userId, userId)),
    )
    .orderBy(desc(programStatus.changedAt));
}

// ----------------------------------------------------- data management

/** Delete a saved assessment: the plan (cascades packets + status) and its conversation (cascades messages). */
export async function deletePlan(userId: string, planId: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ id: plans.id, conversationId: plans.conversationId })
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Plan not found");
  await db.delete(plans).where(eq(plans.id, planId));
  if (row.conversationId) {
    await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, row.conversationId),
          eq(conversations.userId, userId),
        ),
      );
  }
}

/** Purge every row we hold for a user (used on account deletion). */
export async function deleteAllUserData(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(programStatus).where(eq(programStatus.userId, userId));
  await db.delete(packets).where(eq(packets.userId, userId));
  await db.delete(plans).where(eq(plans.userId, userId));
  await db.delete(messages).where(eq(messages.userId, userId));
  await db.delete(conversations).where(eq(conversations.userId, userId));
  await db.delete(profiles).where(eq(profiles.userId, userId));
}

/** A user's full data, decrypted, for the "export my data" download. */
export async function exportUserData(userId: string) {
  const db = getDb();
  const profile = await getProfile(userId);
  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId));
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId));
  const planRows = await db.select().from(plans).where(eq(plans.userId, userId));
  const packetRows = await db
    .select()
    .from(packets)
    .where(eq(packets.userId, userId));
  const statusRows = await db
    .select()
    .from(programStatus)
    .where(eq(programStatus.userId, userId));

  return {
    profile,
    conversations: convos.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      situationSummary: c.situationSummary,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    messages: msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.encContent ? decrypt(m.encContent) : null,
      parts: m.partsJson,
      seq: m.seq,
      createdAt: m.createdAt,
    })),
    plans: planRows.map((p) => ({
      id: p.id,
      conversationId: p.conversationId,
      status: p.status,
      plan: p.planJson,
      createdAt: p.createdAt,
    })),
    packets: packetRows.map((p) => ({
      id: p.id,
      planId: p.planId,
      programIds: p.programIds,
      ...decryptJson<{ intakeAnswers: Record<string, string>; coverLetter: string }>(
        p.encPacket,
      ),
    })),
    programStatus: statusRows.map((s) => ({
      planId: s.planId,
      programId: s.programId,
      status: s.status,
      changedAt: s.changedAt,
    })),
  };
}
