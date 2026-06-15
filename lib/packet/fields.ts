/**
 * Canonical intake-field catalog — the single source of truth for every fact
 * Compass collects to complete an application. Program templates (templates.ts)
 * reference these by id; the intake agent is told to collect them; the review
 * screen and PDF overlay map values back through them.
 *
 * Field ids are stable: form maps and templates depend on them.
 */

export type FieldType = "text" | "number" | "date" | "select";

export type FieldGroup =
  | "identity"
  | "contact"
  | "household"
  | "income"
  | "housing"
  | "utility";

export type FieldDef = {
  /** Stable canonical id (referenced by templates + form maps). */
  id: string;
  /** Human label for the review screen and summary sheets. */
  label: string;
  type: FieldType;
  group: FieldGroup;
  /** Shown in the review UI and given to the interview agent as context. */
  helpText?: string;
  /** For type "select". */
  options?: string[];
};

/**
 * Ordered so prompts, the review screen, and summary sheets all read top-down
 * in a natural intake order. Derived from the real LIHEAP/USF and SNAP form
 * fields the directory programs point at.
 */
export const FIELDS: FieldDef[] = [
  {
    id: "applicant_full_name",
    label: "Full legal name",
    type: "text",
    group: "identity",
    helpText: "The name exactly as it should appear on the application.",
  },
  {
    id: "applicant_dob",
    label: "Date of birth",
    type: "date",
    group: "identity",
  },
  {
    id: "applicant_ssn_itin",
    label: "SSN or ITIN",
    type: "text",
    group: "identity",
    helpText:
      "Optional here — you can leave it blank and provide it in person if you'd rather.",
  },
  {
    id: "preferred_language",
    label: "Preferred language",
    type: "text",
    group: "identity",
    helpText: "The language you're most comfortable getting help in.",
  },
  {
    id: "home_address",
    label: "Street address",
    type: "text",
    group: "contact",
  },
  { id: "home_city", label: "City", type: "text", group: "contact" },
  { id: "home_zip", label: "ZIP code", type: "text", group: "contact" },
  {
    id: "phone",
    label: "Phone number",
    type: "text",
    group: "contact",
  },
  {
    id: "email",
    label: "Email",
    type: "text",
    group: "contact",
    helpText: "Optional.",
  },
  {
    id: "household_size",
    label: "People in your household",
    type: "number",
    group: "household",
    helpText: "Everyone who lives and eats together, including children.",
  },
  {
    id: "household_children",
    label: "Children under 18",
    type: "number",
    group: "household",
  },
  {
    id: "monthly_income",
    label: "Monthly household income",
    type: "number",
    group: "income",
    helpText: "Roughly how much your household brings in per month, before taxes.",
  },
  {
    id: "income_source",
    label: "Main source of income",
    type: "text",
    group: "income",
    helpText: "For example: a job, unemployment, disability, or no income right now.",
  },
  {
    id: "housing_status",
    label: "Do you rent or own?",
    type: "select",
    group: "housing",
    options: ["Rent", "Own"],
  },
  {
    id: "utility_provider",
    label: "Utility company",
    type: "text",
    group: "utility",
    helpText: "The electric or gas company sending the bill (e.g. PSE&G).",
  },
  {
    id: "utility_account",
    label: "Utility account number",
    type: "text",
    group: "utility",
    helpText: "From the top of your bill or shutoff notice.",
  },
  {
    id: "shutoff_date",
    label: "Shutoff date on the notice",
    type: "date",
    group: "utility",
    helpText: "Leave blank if you don't have a shutoff notice.",
  },
];

export const FIELD_BY_ID: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.id, f]),
);
