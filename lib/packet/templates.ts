/**
 * Per-program application templates — owned packet-side, keyed by the directory
 * program `id`. This is the only place that knows what each program's application
 * asks for and how we render it. The directory's ProgramRecord schema is never
 * touched.
 *
 * Every template defaults to `render: "summary"` so the whole feature works
 * end-to-end before any real PDF coordinates are mapped. Flipping a program to
 * `"overlay"` (and adding a `sourcePdf` + formMaps entry) is a per-program
 * upgrade that can't break the rest.
 *
 * Programs with NO template fall back to a base field set (see assemble.ts), so
 * any matched program still produces a usable summary sheet.
 */

/** How a program's filled document is produced in the PDF route. */
export type RenderStrategy = "overlay" | "summary";

export type ProgramTemplate = {
  programId: string;
  /** Field ids (from fields.ts) the application needs. */
  requiredFieldIds: string[];
  /** Helpful-but-not-essential field ids. */
  optionalFieldIds?: string[];
  render: RenderStrategy;
  /** Filename in lib/packet/forms/ — required when render is "overlay". */
  sourcePdf?: string;
  /** One clause the cover letter weaves in, naming what we're asking this office for. */
  letterFraming: string;
};

export const TEMPLATES: ProgramTemplate[] = [
  {
    programId: "nj-liheap-usf",
    requiredFieldIds: [
      "applicant_full_name",
      "applicant_dob",
      "home_address",
      "home_city",
      "home_zip",
      "household_size",
      "monthly_income",
      "utility_provider",
      "utility_account",
    ],
    optionalFieldIds: [
      "applicant_ssn_itin",
      "preferred_language",
      "phone",
      "shutoff_date",
      "income_source",
    ],
    // Real FY2025 form is a flat PDF (no fillable fields) -> overlay once mapped.
    // Starts as summary so it works before coordinates are dialed in.
    render: "summary",
    sourcePdf: "nj-liheap-usf.pdf",
    letterFraming:
      "apply for LIHEAP/USF energy assistance and ask that any pending shutoff be held while it is reviewed",
  },
  {
    programId: "hudson-bsds-snap",
    requiredFieldIds: [
      "applicant_full_name",
      "applicant_dob",
      "home_address",
      "home_city",
      "home_zip",
      "household_size",
      "monthly_income",
      "income_source",
    ],
    optionalFieldIds: ["applicant_ssn_itin", "phone", "household_children"],
    // SNAP form has no utility-account field, so utility fields are intentionally absent.
    render: "summary",
    sourcePdf: "hudson-bsds-snap.pdf",
    letterFraming:
      "apply for SNAP (food assistance), including emergency/expedited screening if my household qualifies",
  },
  {
    programId: "hudson-wic",
    requiredFieldIds: [
      "applicant_full_name",
      "applicant_dob",
      "home_address",
      "home_city",
      "home_zip",
      "household_size",
      "household_children",
    ],
    optionalFieldIds: ["monthly_income", "income_source", "phone"],
    // WIC has no public application PDF (appointment-based) -> always summary.
    render: "summary",
    letterFraming:
      "request a WIC appointment for nutrition help for my young children (we may qualify automatically if we are on SNAP or Medicaid)",
  },
];

export const TEMPLATE_BY_ID: Record<string, ProgramTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.programId, t]),
);
