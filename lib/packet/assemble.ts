/**
 * Pure helpers shared by the intake prompt, the review screen, and the PDF route.
 * No I/O, no React — fully unit-testable.
 */

import { FIELDS, FIELD_BY_ID, type FieldDef } from "./fields";
import { TEMPLATE_BY_ID } from "./templates";
import type { IntakeAnswers } from "./schema";

export type RequiredField = FieldDef & {
  /** Program ids that need this field. */
  neededFor: string[];
  /** True only if optional for every program that needs it. */
  optional: boolean;
};

/**
 * Base fields used when a matched program has no template — keeps intake useful
 * for any program, including ones a teammate adds to the directory later.
 */
export const BASE_FIELD_IDS = [
  "applicant_full_name",
  "applicant_dob",
  "home_address",
  "home_city",
  "home_zip",
  "phone",
  "household_size",
  "monthly_income",
  "housing_status",
];

/**
 * Union of the fields needed across the chosen programs, de-duplicated, with a
 * graceful fallback for template-less programs. Output is in catalog order so
 * prompts and tests are deterministic. "Required wins over optional": a field
 * required by any program is required overall.
 */
export function computeRequiredFields(programIds: string[]): RequiredField[] {
  const acc = new Map<string, RequiredField>();

  const add = (id: string, programId: string, optional: boolean) => {
    const def = FIELD_BY_ID[id];
    if (!def) return; // unknown id — skip defensively
    const existing = acc.get(id);
    if (existing) {
      if (!existing.neededFor.includes(programId)) {
        existing.neededFor.push(programId);
      }
      existing.optional = existing.optional && optional;
    } else {
      acc.set(id, { ...def, neededFor: [programId], optional });
    }
  };

  for (const pid of programIds) {
    const tpl = TEMPLATE_BY_ID[pid];
    if (tpl) {
      tpl.requiredFieldIds.forEach((id) => add(id, pid, false));
      (tpl.optionalFieldIds ?? []).forEach((id) => add(id, pid, true));
    } else {
      BASE_FIELD_IDS.forEach((id) => add(id, pid, false));
    }
  }

  return FIELDS.map((f) => acc.get(f.id)).filter(
    (f): f is RequiredField => Boolean(f),
  );
}

/**
 * Ordered label/value rows for one program's summary sheet (the fallback render).
 * Missing answers render as an em dash.
 */
export function summaryRows(
  programId: string,
  answers: IntakeAnswers,
): { label: string; value: string }[] {
  const tpl = TEMPLATE_BY_ID[programId];
  const ids = tpl
    ? [...tpl.requiredFieldIds, ...(tpl.optionalFieldIds ?? [])]
    : BASE_FIELD_IDS;
  return ids.map((id) => ({
    label: FIELD_BY_ID[id]?.label ?? id,
    value: answers[id]?.trim() || "—",
  }));
}

export type ReviewRow = {
  id: string;
  label: string;
  value: string;
  optional: boolean;
  helpText?: string;
  type: FieldDef["type"];
  options?: string[];
  neededFor: string[];
};

/** The exact field rows the human review screen shows and lets the user edit. */
export function reviewRows(
  programIds: string[],
  answers: IntakeAnswers,
): ReviewRow[] {
  return computeRequiredFields(programIds).map((f) => ({
    id: f.id,
    label: f.label,
    value: answers[f.id] ?? "",
    optional: f.optional,
    helpText: f.helpText,
    type: f.type,
    options: f.options,
    neededFor: f.neededFor,
  }));
}
