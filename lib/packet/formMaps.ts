/**
 * Coordinate overlay maps for the real (flat, non-fillable) application PDFs.
 *
 * The official NJ LIHEAP/USF and SNAP forms have NO interactive AcroForm fields
 * — they are flat documents with a text layer. So we can't `setTextField(name)`;
 * instead we stamp each value at an (x, y) position on a given page.
 *
 * pdf-lib's coordinate origin is the BOTTOM-LEFT of the page, y grows upward.
 * Coordinates are measured per form (Letter, 612x792pt) and filled in during the
 * overlay workstream. Until a program has an entry here, its template stays
 * `render: "summary"` and this map is simply unused for it.
 */

export type OverlayBinding = {
  kind: "overlay";
  /** 0-based page index in the source PDF. */
  page: number;
  /** Points from the left edge. */
  x: number;
  /** Points from the bottom edge. */
  y: number;
  /** Font size; defaults to 10 in the renderer. */
  size?: number;
};

export type FieldBinding = OverlayBinding;

/** programId -> (canonical field id -> where to stamp it). */
export const FORM_MAPS: Record<string, Record<string, FieldBinding>> = {
  // Filled in during the overlay workstream, e.g.:
  // "nj-liheap-usf": {
  //   applicant_full_name: { kind: "overlay", page: 0, x: 120, y: 690 },
  //   home_address:        { kind: "overlay", page: 0, x: 120, y: 660 },
  //   ...
  // },
};
