import type { IntakeAnswers } from "./schema";

/**
 * Fill the agent's drafted cover email locally — no PII ever goes to the model.
 * The agent emits `ActionPlan.draftedEmail` with [bracketed] placeholders; we
 * substitute the person's own answers here, on the client/server, and leave any
 * placeholder we can't map intact so the user can finish it by hand.
 */
const PLACEHOLDER_TO_FIELD: Record<string, string> = {
  name: "applicant_full_name",
  "your name": "applicant_full_name",
  "full name": "applicant_full_name",
  "your full name": "applicant_full_name",
  phone: "phone",
  "your phone": "phone",
  "phone number": "phone",
  email: "email",
  "your email": "email",
  "email address": "email",
  address: "home_address",
  "your address": "home_address",
  "home address": "home_address",
  "street address": "home_address",
  city: "home_city",
  zip: "home_zip",
  "zip code": "home_zip",
  "account number": "utility_account",
  "utility account": "utility_account",
  account: "utility_account",
  "date of birth": "applicant_dob",
  dob: "applicant_dob",
};

export function fillCoverLetter(
  draftedEmail: string,
  answers: IntakeAnswers,
): string {
  if (!draftedEmail) return "";
  return draftedEmail.replace(/\[([^\]]+)\]/g, (whole, inner: string) => {
    const key = inner.trim().toLowerCase().replace(/[:.]+$/, "");
    const fieldId = PLACEHOLDER_TO_FIELD[key];
    const value = fieldId ? answers[fieldId]?.trim() : "";
    return value || whole; // leave the placeholder if we can't fill it
  });
}
