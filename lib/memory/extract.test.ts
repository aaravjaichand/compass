import { beforeAll, describe, expect, it } from "vitest";
import { containsRawIdentifier, extractMemories } from "./extract";
import type { ActionPlan } from "@/lib/agent/schema";

beforeAll(() => {
  // The transcript (LLM) layer is opt-in on a key; force the deterministic path
  // so these tests are hermetic and never make a network call.
  delete process.env.GROQ_API_KEY;
});

describe("memory minimization", () => {
  it("flags raw identifiers that must never be stored", () => {
    expect(containsRawIdentifier("My SSN is 123-45-6789")).toBe(true);
    expect(containsRawIdentifier("Born 04/12/1990")).toBe(true);
    expect(containsRawIdentifier("Reach me at marisol@example.com")).toBe(true);
    expect(containsRawIdentifier("Account 4002 1234 5678")).toBe(true);
    expect(containsRawIdentifier("I live at 240 Newark Ave")).toBe(true);
  });

  it("allows minimized, situational facts", () => {
    expect(containsRawIdentifier("Has two young children")).toBe(false);
    expect(containsRawIdentifier("Pursuing: LIHEAP & USF, SNAP.")).toBe(false);
    expect(containsRawIdentifier("Looked for utility help.")).toBe(false);
  });
});

describe("deterministic extraction from a plan", () => {
  const plan: ActionPlan = {
    situationSummary:
      "You got a utility shutoff notice and food is running low for your two kids.",
    matches: [
      {
        programId: "liheap-usf-nj",
        matchReason: "Helps with the electric bill.",
        confidence: "high",
        eligibility: "You likely qualify.",
      },
    ],
    checklist: ["Photo ID", "Recent utility bill"],
    draftedEmail: "Hello, I need help with my electric bill. [Your name]",
    flags: [],
  };

  it("produces non-empty, PII-free memories", async () => {
    const items = await extractMemories({ transcript: [], plan, lang: "en" });
    expect(items.length).toBeGreaterThan(0);
    // The situation restatement is captured verbatim (already non-PII).
    expect(items.some((m) => m.kind === "situation")).toBe(true);
    // Nothing returned may contain a raw identifier.
    for (const m of items) {
      expect(containsRawIdentifier(m.content)).toBe(false);
    }
  });

  it("returns nothing when there is no plan and no transcript", async () => {
    const items = await extractMemories({ transcript: [], plan: null, lang: "en" });
    expect(items).toEqual([]);
  });
});
