import programsData from "./programs.json";
import type {
  ProgramRecord,
  RequiredDocsResult,
  SearchArgs,
} from "./types";

/**
 * Bundled, read-only directory: real, sourced Hudson/Bergen 211 program records
 * (programs.json, each cited and marked isSynthetic: false). Cast once here; the
 * JSON is the data seam and is validated by tests.
 */
export const ALL_PROGRAMS = programsData as unknown as ProgramRecord[];

const MAX_RESULTS = 8;

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Searchable text for a program, weighted by where the term appears. */
function score(program: ProgramRecord, terms: string[]): number {
  if (terms.length === 0) return 0;
  const name = program.name.toLowerCase();
  const categories = program.category.join(" ").toLowerCase();
  const body = [
    program.summary,
    program.org,
    program.services.join(" "),
    program.eligibility.summary,
  ]
    .join(" ")
    .toLowerCase();

  let total = 0;
  for (const term of terms) {
    if (categories.includes(term)) total += 4;
    if (name.includes(term)) total += 3;
    if (body.includes(term)) total += 1;
  }
  return total;
}

export function getProgramById(id: string): ProgramRecord | undefined {
  return ALL_PROGRAMS.find((p) => p.id === id);
}

/**
 * search_programs — rank directory programs against a need.
 * Pure and deterministic: same args always return the same ordered list.
 */
export function search_programs(args: SearchArgs): ProgramRecord[] {
  const terms = [
    ...(args.needs ?? []).flatMap(tokenize),
    ...(args.keywords ? tokenize(args.keywords) : []),
  ];

  // Require an actual need — an empty query returns nothing rather than the
  // whole directory, so the agent must state what it's searching for.
  if (terms.length === 0 && !args.category) return [];

  return ALL_PROGRAMS.map((program) => {
    let s = score(program, terms);
    if (args.category && program.category.includes(args.category)) s += 5;
    if (args.county && program.location.county === args.county) s += 2;
    return { program, s };
  })
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.program.name.localeCompare(b.program.name))
    .slice(0, MAX_RESULTS)
    .map((r) => r.program);
}

/**
 * get_required_docs — resolve the documents a specific program needs, by id.
 */
export function get_required_docs(args: {
  programId: string;
}): RequiredDocsResult {
  const program = getProgramById(args.programId);
  if (!program) {
    return {
      programId: args.programId,
      found: false,
      requiredDocs: [],
      notes: "No program with that id exists in the directory.",
    };
  }
  return {
    programId: program.id,
    found: true,
    requiredDocs: program.requiredDocs,
    notes: `Documents for ${program.name} (${program.org}).`,
  };
}
