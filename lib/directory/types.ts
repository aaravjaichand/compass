/**
 * The data seam between retrieval (owned by Arnav) and the rest of Compass.
 * `ProgramRecord` + the two lookups below are the only contract the agent depends on,
 * so synthetic seed data can be swapped for real 211 Hudson/Bergen records behind it.
 */

export type Category =
  | "food"
  | "utility"
  | "housing"
  | "health"
  | "cash"
  | "childcare"
  | "legal";

export type County = "Hudson" | "Bergen";

export type ProgramRecord = {
  /** Stable id — every fact in a packet cites this. */
  id: string;
  name: string;
  org: string;
  category: Category[];
  /** Plain-language, one-or-two sentences. */
  summary: string;
  services: string[];
  eligibility: {
    summary: string;
    income?: string;
    residency?: string;
    household?: string;
    notes?: string;
  };
  requiredDocs: string[];
  location: {
    address?: string;
    city: string;
    county: County;
    zip?: string;
    /** Approximate coordinates for the "Help near you" map. */
    geo?: { lat: number; lng: number };
  };
  hours?: string;
  contact: {
    phone?: string;
    url?: string;
    email?: string;
    languages?: string[];
  };
  lastUpdated: string;
  source: string;
  isSynthetic: boolean;
};

export type SearchArgs = {
  needs?: string[];
  category?: Category;
  county?: County;
  keywords?: string;
};

export type RequiredDocsResult = {
  programId: string;
  found: boolean;
  requiredDocs: string[];
  notes?: string;
};
