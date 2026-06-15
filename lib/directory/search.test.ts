import { describe, expect, it } from "vitest";
import {
  ALL_PROGRAMS,
  get_required_docs,
  getProgramById,
  search_programs,
} from "./search";
import type { ProgramRecord } from "./types";

describe("directory data integrity", () => {
  it("has a healthy seed of records", () => {
    expect(ALL_PROGRAMS.length).toBeGreaterThanOrEqual(10);
  });

  it("every record has the required shape and a unique id", () => {
    const ids = new Set<string>();
    for (const p of ALL_PROGRAMS as ProgramRecord[]) {
      expect(p.id, "id").toBeTruthy();
      expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.name).toBeTruthy();
      expect(p.category.length).toBeGreaterThan(0);
      expect(p.summary).toBeTruthy();
      expect(Array.isArray(p.requiredDocs)).toBe(true);
      expect(["Hudson", "Bergen"]).toContain(p.location.county);
      // Seed data must be honestly labeled synthetic.
      expect(p.isSynthetic).toBe(true);
    }
  });
});

describe("search_programs", () => {
  it("surfaces utility relief for a shutoff", () => {
    const results = search_programs({
      needs: ["utility shutoff"],
      keywords: "electric bill shutoff",
      county: "Hudson",
    });
    const ids = results.map((p) => p.id);
    expect(ids).toContain("nj-liheap-usf");
    expect(results[0].category).toContain("utility");
  });

  it("surfaces food help for an empty fridge", () => {
    const ids = search_programs({ needs: ["food"], county: "Hudson" }).map(
      (p) => p.id,
    );
    expect(ids).toContain("hudson-bsds-snap");
    expect(ids).toContain("york-street-pantry");
  });

  it("filters by category", () => {
    const results = search_programs({ category: "food" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.category.includes("food"))).toBe(true);
  });

  it("boosts the matching county", () => {
    const results = search_programs({ needs: ["food"], county: "Bergen" });
    expect(results[0].location.county).toBe("Bergen");
  });

  it("is deterministic", () => {
    const a = search_programs({ keywords: "rent eviction", county: "Hudson" });
    const b = search_programs({ keywords: "rent eviction", county: "Hudson" });
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("returns nothing for an empty query", () => {
    expect(search_programs({})).toEqual([]);
  });
});

describe("get_required_docs", () => {
  it("resolves docs for a real program", () => {
    const res = get_required_docs({ programId: "hudson-wic" });
    expect(res.found).toBe(true);
    expect(res.requiredDocs.length).toBeGreaterThan(0);
  });

  it("handles an unknown id without throwing", () => {
    const res = get_required_docs({ programId: "does-not-exist" });
    expect(res.found).toBe(false);
    expect(res.requiredDocs).toEqual([]);
  });
});

describe("getProgramById", () => {
  it("finds a known program", () => {
    expect(getProgramById("988-lifeline")?.contact.phone).toBe("988");
  });
});
