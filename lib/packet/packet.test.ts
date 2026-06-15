import { describe, expect, it } from "vitest";
import { getProgramById } from "../directory/search";
import { FIELDS, FIELD_BY_ID } from "./fields";
import { TEMPLATES, TEMPLATE_BY_ID } from "./templates";
import { FORM_MAPS } from "./formMaps";
import {
  BASE_FIELD_IDS,
  computeRequiredFields,
  reviewRows,
  summaryRows,
} from "./assemble";

describe("field catalog integrity", () => {
  it("has unique ids that FIELD_BY_ID fully covers", () => {
    const ids = new Set<string>();
    for (const f of FIELDS) {
      expect(f.id, "id").toBeTruthy();
      expect(ids.has(f.id), `duplicate field id ${f.id}`).toBe(false);
      ids.add(f.id);
      expect(f.label).toBeTruthy();
      expect(FIELD_BY_ID[f.id]).toBe(f);
    }
  });

  it("select fields declare options", () => {
    for (const f of FIELDS) {
      if (f.type === "select") {
        expect(f.options && f.options.length > 0, `options for ${f.id}`).toBe(true);
      }
    }
  });

  it("base fallback fields all exist in the catalog", () => {
    for (const id of BASE_FIELD_IDS) {
      expect(FIELD_BY_ID[id], `base field ${id}`).toBeTruthy();
    }
  });
});

describe("template integrity", () => {
  it("every template targets a real program and known fields", () => {
    for (const tpl of TEMPLATES) {
      expect(
        getProgramById(tpl.programId),
        `template program ${tpl.programId} must exist in the directory`,
      ).toBeTruthy();
      for (const id of [
        ...tpl.requiredFieldIds,
        ...(tpl.optionalFieldIds ?? []),
      ]) {
        expect(FIELD_BY_ID[id], `field ${id} in ${tpl.programId}`).toBeTruthy();
      }
    }
  });

  it("overlay templates carry a source PDF and a form map", () => {
    for (const tpl of TEMPLATES) {
      if (tpl.render === "overlay") {
        expect(tpl.sourcePdf, `${tpl.programId} sourcePdf`).toBeTruthy();
        expect(
          FORM_MAPS[tpl.programId],
          `${tpl.programId} needs a FORM_MAPS entry`,
        ).toBeTruthy();
      }
    }
  });
});

describe("form map integrity", () => {
  it("maps only real programs with non-summary templates and known fields", () => {
    for (const [programId, map] of Object.entries(FORM_MAPS)) {
      const tpl = TEMPLATE_BY_ID[programId];
      expect(tpl, `form map for unknown template ${programId}`).toBeTruthy();
      expect(tpl.render).not.toBe("summary");
      for (const [fieldId, binding] of Object.entries(map)) {
        expect(FIELD_BY_ID[fieldId], `mapped field ${fieldId}`).toBeTruthy();
        expect(Number.isFinite(binding.x)).toBe(true);
        expect(Number.isFinite(binding.y)).toBe(true);
        expect(Number.isInteger(binding.page)).toBe(true);
      }
    }
  });
});

describe("computeRequiredFields", () => {
  it("unions and de-duplicates across programs", () => {
    const fields = computeRequiredFields(["nj-liheap-usf", "hudson-bsds-snap"]);
    const ids = fields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length); // no dupes
    expect(ids).toContain("applicant_full_name"); // shared by both
    expect(ids).toContain("utility_account"); // LIHEAP only
    const shared = fields.find((f) => f.id === "applicant_full_name");
    expect(shared?.neededFor).toEqual(
      expect.arrayContaining(["nj-liheap-usf", "hudson-bsds-snap"]),
    );
  });

  it("falls back to base fields for a program with no template", () => {
    const ids = computeRequiredFields(["does-not-exist"]).map((f) => f.id);
    expect(ids).toEqual(BASE_FIELD_IDS.filter((id) => ids.includes(id)));
    for (const baseId of BASE_FIELD_IDS) expect(ids).toContain(baseId);
  });

  it("required wins over optional when programs disagree", () => {
    // income_source is required for SNAP, optional for LIHEAP.
    const fields = computeRequiredFields(["nj-liheap-usf", "hudson-bsds-snap"]);
    const incomeSrc = fields.find((f) => f.id === "income_source");
    expect(incomeSrc?.optional).toBe(false);
  });

  it("is deterministic and in catalog order", () => {
    const a = computeRequiredFields(["hudson-bsds-snap", "nj-liheap-usf"]);
    const b = computeRequiredFields(["nj-liheap-usf", "hudson-bsds-snap"]);
    expect(a.map((f) => f.id)).toEqual(b.map((f) => f.id));
    const catalogOrder = FIELDS.map((f) => f.id);
    const positions = a.map((f) => catalogOrder.indexOf(f.id));
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
  });
});

describe("summaryRows", () => {
  it("renders missing answers as an em dash, in template order", () => {
    const rows = summaryRows("nj-liheap-usf", { applicant_full_name: "Marisol Reyes" });
    expect(rows[0]).toEqual({ label: "Full legal name", value: "Marisol Reyes" });
    expect(rows.some((r) => r.value === "—")).toBe(true);
  });
});

describe("reviewRows", () => {
  it("carries value, optionality, and type for each required field", () => {
    const rows = reviewRows(["hudson-wic"], { applicant_full_name: "Marisol Reyes" });
    const name = rows.find((r) => r.id === "applicant_full_name");
    expect(name?.value).toBe("Marisol Reyes");
    expect(name?.optional).toBe(false);
    expect(name?.type).toBe("text");
  });
});
