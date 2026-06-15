/**
 * Server-side packet PDF builder (Node runtime only — reads bundled forms via fs).
 *
 * Produces ONE merged PDF: a personalized cover letter, then for each program
 * either the real application form with the person's answers overlaid at mapped
 * coordinates (when we have a source PDF + form map), or a clean generated
 * "application summary" sheet as the always-available fallback.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type Color,
} from "pdf-lib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getProgramById } from "@/lib/directory/search";
import { TEMPLATE_BY_ID } from "./templates";
import { FORM_MAPS } from "./formMaps";
import { summaryRows } from "./assemble";
import type { IntakeAnswers, PacketSpec } from "./schema";

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 56;
const BODY_SIZE = 11;
const LINE = 1.4;
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.33, 0.33, 0.33);
const HAIR = rgb(0.8, 0.8, 0.8);

type Fonts = { regular: PDFFont; bold: PDFFont };
type TextOpts = { size?: number; bold?: boolean; color?: Color };

/** Greedy word-wrap; preserves explicit newlines (and blank lines). */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.trim() === "") {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of rawLine.split(/\s+/)) {
      const trial = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(trial, size) > maxWidth) {
        out.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** A paginating top-down text flow over one output document. */
class Flow {
  private page: PDFPage;
  private y: number;

  constructor(
    private doc: PDFDocument,
    private fonts: Fonts,
  ) {
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  /** Ensure room for `h` points, adding a page if needed. */
  private ensure(h: number) {
    if (this.y - h < MARGIN) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.y = PAGE_H - MARGIN;
    }
  }

  startPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  gap(h: number) {
    this.ensure(h);
    this.y -= h;
  }

  text(s: string, opts: TextOpts = {}) {
    const size = opts.size ?? BODY_SIZE;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const lh = size * LINE;
    for (const line of wrapText(s, font, size, PAGE_W - MARGIN * 2)) {
      this.ensure(lh);
      if (line) {
        this.page.drawText(line, {
          x: MARGIN,
          y: this.y - size,
          size,
          font,
          color: opts.color ?? INK,
        });
      }
      this.y -= lh;
    }
  }

  /** Label/value row for summary sheets (label left, wrapped value right). */
  row(label: string, value: string) {
    const size = BODY_SIZE;
    const lh = size * LINE;
    const labelW = 175;
    const valX = MARGIN + labelW;
    const lines = wrapText(value, this.fonts.regular, size, PAGE_W - MARGIN - valX);
    this.ensure(lh * Math.max(1, lines.length));
    this.page.drawText(label, {
      x: MARGIN,
      y: this.y - size,
      size,
      font: this.fonts.bold,
      color: MUTED,
    });
    lines.forEach((line, i) => {
      this.page.drawText(line, {
        x: valX,
        y: this.y - size - i * lh,
        size,
        font: this.fonts.regular,
        color: INK,
      });
    });
    this.y -= lh * Math.max(1, lines.length);
  }

  rule() {
    this.ensure(8);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.5,
      color: HAIR,
    });
    this.y -= 8;
  }
}

function loadSourcePdf(name: string): Uint8Array | null {
  try {
    return readFileSync(join(process.cwd(), "lib/packet/forms", name));
  } catch {
    return null;
  }
}

/** Copy a real form's pages in and stamp answers at mapped coordinates. */
async function addOverlay(
  doc: PDFDocument,
  programId: string,
  bytes: Uint8Array,
  answers: IntakeAnswers,
  fonts: Fonts,
): Promise<void> {
  const src = await PDFDocument.load(bytes);
  const copied = await doc.copyPages(src, src.getPageIndices());
  const firstIndex = doc.getPageCount();
  copied.forEach((p) => doc.addPage(p));

  const map = FORM_MAPS[programId] ?? {};
  for (const [fieldId, binding] of Object.entries(map)) {
    const value = answers[fieldId]?.trim();
    if (!value) continue;
    const page = doc.getPage(firstIndex + binding.page);
    try {
      page.drawText(value, {
        x: binding.x,
        y: binding.y,
        size: binding.size ?? 10,
        font: fonts.regular,
        color: INK,
      });
    } catch {
      // One bad coordinate shouldn't abort the whole packet.
    }
  }
}

function addSummarySheet(
  flow: Flow,
  programId: string,
  answers: IntakeAnswers,
) {
  const program = getProgramById(programId);
  flow.startPage();
  flow.text("APPLICATION SUMMARY", { size: 9, bold: true, color: MUTED });
  flow.gap(8);
  flow.text(program?.name ?? programId, { size: 16, bold: true });
  if (program?.org) flow.text(program.org, { size: 11, color: MUTED });

  flow.gap(10);
  const submit = [program?.contact.phone, program?.contact.url]
    .filter(Boolean)
    .join("   ·   ");
  if (submit) flow.text(`Submit to:  ${submit}`, { size: 10, color: MUTED });
  const loc = program
    ? [program.location.address, program.location.city, `${program.location.county} County`]
        .filter(Boolean)
        .join(", ")
    : "";
  if (loc) flow.text(loc, { size: 10, color: MUTED });

  flow.gap(10);
  flow.rule();
  flow.gap(8);
  for (const { label, value } of summaryRows(programId, answers)) {
    flow.row(label, value);
  }

  const docs = program?.requiredDocs ?? [];
  if (docs.length) {
    flow.gap(14);
    flow.text("Documents to bring", { size: 11, bold: true });
    flow.gap(4);
    for (const d of docs) flow.text(`•  ${d}`, { size: 10 });
  }

  flow.gap(16);
  flow.text(
    "Prepared with Compass — a summary to bring to the office, not an official form. Nothing has been submitted.",
    { size: 9, color: MUTED },
  );
}

export async function buildPacketPdf(spec: PacketSpec): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  // Cover letter first.
  const flow = new Flow(doc, fonts);
  flow.text("COMPASS · FILING PACKET", { size: 9, bold: true, color: MUTED });
  flow.gap(8);
  flow.text("Cover letter", { size: 18, bold: true });
  flow.gap(12);
  flow.text(spec.coverLetter);
  flow.gap(18);
  flow.text(
    "Prepared with Compass. Nothing has been submitted. Review every detail, then file it yourself.",
    { size: 9, color: MUTED },
  );

  // Then one document per program — real form overlay where available, else summary.
  for (const programId of spec.programIds) {
    const tpl = TEMPLATE_BY_ID[programId];
    if (tpl?.render === "overlay" && tpl.sourcePdf) {
      const bytes = loadSourcePdf(tpl.sourcePdf);
      if (bytes) {
        await addOverlay(doc, programId, bytes, spec.intakeAnswers, fonts);
        continue;
      }
      // Missing source file — fall through to the summary sheet.
    }
    addSummarySheet(flow, programId, spec.intakeAnswers);
  }

  return doc.save();
}
