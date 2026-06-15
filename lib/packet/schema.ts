import { z } from "zod";

/**
 * What the intake agent collects and hands off, and what the PDF route accepts.
 * Mirrors the role of lib/agent/schema.ts's actionPlanSchema: the terminal tool
 * `assemble_packet` is given `assemblePacketSchema.shape`, and its tool input is
 * emitted to the client as a `data-packet` part.
 */

/** Canonical field id -> the person's answer (plain strings; numbers stringified). */
export const intakeAnswersSchema = z.record(z.string(), z.string());
export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>;

export const assemblePacketSchema = z.object({
  programIds: z
    .array(z.string())
    .min(1)
    .describe("The program ids this packet targets (from the action plan)."),
  intakeAnswers: intakeAnswersSchema.describe(
    "Canonical field id -> the person's real answer. Never use placeholders.",
  ),
  coverLetter: z
    .string()
    .min(1)
    .describe(
      "A complete, personalized cover letter in the person's voice using their real answers. No [brackets].",
    ),
});
export type AssemblePacket = z.infer<typeof assemblePacketSchema>;

/** The PDF route re-validates the same shape it received from the client. */
export const packetSpecSchema = assemblePacketSchema;
export type PacketSpec = z.infer<typeof packetSpecSchema>;
