import type { ActionPlan } from "@/lib/agent/schema";

/**
 * A static, pre-generated action plan for Marisol, shown read-only on the
 * public landing so a visitor sees the real output shape before signing in.
 * The program ids match real records in lib/directory/programs.json so the
 * ActionPlanView resolves and renders them fully.
 */
export const MARISOL_SAMPLE_PLAN: ActionPlan = {
  situationSummary:
    "You're a parent in Jersey City whose work hours were just cut, you've received an electricity shutoff notice, and food is running low for your two young children.",
  matches: [
    {
      programId: "nj-liheap-usf",
      matchReason:
        "You have an active electricity shutoff notice and reduced income. LIHEAP and the Universal Service Fund help cover overdue energy bills for households in exactly this situation.",
      confidence: "high",
      eligibility:
        "You likely qualify: NJ residency plus income within program limits for a household of three. Bring your shutoff notice and a recent pay stub to confirm.",
    },
    {
      programId: "hudson-bsds-snap",
      matchReason:
        "A drop in income with children at home and an empty fridge is the core case SNAP is built for. It provides monthly funds for groceries.",
      confidence: "high",
      eligibility:
        "You likely qualify based on a household of three and reduced earnings, though the county office makes the final determination.",
    },
    {
      programId: "hudson-wic",
      matchReason:
        "WIC supports nutrition for young children and pregnant or postpartum parents; your children may fall within the eligible age range.",
      confidence: "medium",
      eligibility:
        "You may qualify if a child is under five. Confirm each child's age and bring proof of income.",
    },
    {
      programId: "triangle-park-pantry",
      matchReason:
        "For food you need this week, a local pantry bridges the gap while SNAP and WIC applications are processed.",
      confidence: "high",
      eligibility:
        "No formal eligibility. Pantries serve anyone in need. Call ahead for hours and what to bring.",
    },
  ],
  checklist: [
    "Photo ID for the adult applicant",
    "The electricity shutoff notice",
    "A recent pay stub or proof of reduced hours",
    "Social Security numbers or ITINs for the household (if available)",
    "Proof of address (a lease or a utility bill)",
    "Birth certificates or IDs for the children",
  ],
  draftedEmail:
    "Hello,\n\nMy name is [Your name] and I live in Jersey City. My work hours were recently cut and I received a notice that my electricity will be shut off. I have two young children at home and am seeking help with my energy bill and food assistance.\n\nCould you tell me what I need to apply and whether I can be seen this week? You can reach me at [Phone] or [Email].\n\nThank you for your time.\n[Your name]",
  flags: ["minor_benefits", "cross_agency"],
};
