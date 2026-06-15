/**
 * Drizzle schema for Compass persistence (Neon Postgres).
 *
 * Privacy convention:
 *   - `enc_*` text columns hold an AES-256-GCM envelope (see lib/crypto.ts);
 *     they carry PII (identity fields, raw narrative, filled intake answers)
 *     and are only ever decrypted server-side.
 *   - All other columns are plaintext, non-PII, and safe to list/filter on.
 *
 * Ownership: every row carries `user_id` (the Neon Auth / Stack user id). There
 * is intentionally NO hard FK to `neon_auth.users_sync` — that table is synced
 * asynchronously, so a fresh user's row can lag an insert. Ownership is enforced
 * at the app layer (`row.user_id === session user.id`), not via RLS.
 */
import {
  pgTable,
  text,
  uuid,
  jsonb,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

const created = timestamp("created_at", { withTimezone: true, mode: "date" })
  .notNull()
  .defaultNow();
const updated = timestamp("updated_at", { withTimezone: true, mode: "date" })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/** One row per user: the reusable profile + app preferences. */
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  /** ENCRYPTED: JSON of fields.ts identity/contact values (name, address, phone, dob, ssn/itin, …). */
  encProfile: text("enc_profile"),
  /** Plaintext: directory scope captured at onboarding. */
  county: text("county"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  /** 'light' | 'dark' | 'system' — cross-device mirror of the theme cookie. */
  theme: text("theme").notNull().default("system"),
  createdAt: created,
  updatedAt: updated,
});

/** One resumable assess session. */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  /** Plaintext, generic, non-PII (e.g. "Utility shutoff — Jersey City"). */
  title: text("title"),
  status: text("status").notNull().default("active"),
  /** Plaintext: ActionPlan.situationSummary (a restatement, no identity PII). */
  situationSummary: text("situation_summary"),
  createdAt: created,
  updatedAt: updated,
});

/** Transcript rows for a conversation (enables resume + delete-chat). */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  /** ENCRYPTED: the raw message text (the user's words can contain PII). */
  encContent: text("enc_content"),
  /** Plaintext: non-PII structured parts (data-step / data-note / data-plan) for re-render. */
  partsJson: jsonb("parts_json"),
  seq: integer("seq").notNull().default(0),
  createdAt: created,
});

/** A saved ActionPlan (no identity PII — bracketed draftedEmail stored unfilled). */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  /** Plaintext: full ActionPlan (lib/agent/schema.ts). */
  planJson: jsonb("plan_json").notNull(),
  status: text("status").notNull().default("saved"), // 'saved' | 'in_progress' | 'filed'
  createdAt: created,
  updatedAt: updated,
});

/** A generated PDF packet record (PDF bytes are regenerated on demand, not stored). */
export const packets = pgTable("packets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "cascade" }),
  /** Plaintext: just program ids. */
  programIds: text("program_ids").array().notNull(),
  /** ENCRYPTED: JSON of { intakeAnswers, coverLetter } (PacketSpec shape, holds PII). */
  encPacket: text("enc_packet").notNull(),
  createdAt: created,
});

/** User-maintained, self-reported per-program status (one row per change = a timeline). */
export const programStatus = pgTable("program_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  programId: text("program_id").notNull(),
  // 'not_started' | 'gathering_docs' | 'submitted' | 'approved' | 'denied'
  status: text("status").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/**
 * A publicly-shareable, read-only snapshot of a plan, so a person can hand it
 * off to a helper (family, friend, caseworker). Intentionally has NO user_id and
 * needs no auth — the stored ActionPlan is non-PII (the draftedEmail is bracketed,
 * the situationSummary is a restatement), and it powers the guest `/try` demo too.
 */
export const sharedPlans = pgTable("shared_plans", {
  /** Unguessable random token (the share URL slug). */
  token: text("token").primaryKey(),
  /** Plaintext: full ActionPlan (lib/agent/schema.ts), non-PII. */
  planJson: jsonb("plan_json").notNull(),
  /** 'en' | 'es' — the language the plan content was written in. */
  lang: text("lang").notNull().default("en"),
  createdAt: created,
});

export type Profile = typeof profiles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Packet = typeof packets.$inferSelect;
export type ProgramStatus = typeof programStatus.$inferSelect;
export type SharedPlan = typeof sharedPlans.$inferSelect;
