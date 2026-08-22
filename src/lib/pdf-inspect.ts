import { PDFDocument } from "pdf-lib";

export type PdfInspection =
  { ok: true; pageCount: number } | { ok: false; reason: string };

/**
 * A recipe is a handful of pages. This is generous enough for a long one with
 * photos, and low enough that a scanned cookbook does not quietly cost a
 * fortune to extract or overflow the model's page limit.
 */
export const MAX_PDF_PAGES = 30;

/** The first bytes of every PDF. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/**
 * Is this actually a usable recipe PDF?
 *
 * Checked before the file reaches the model, because everything downstream is
 * slow and billable: a 600-page scan, a renamed .docx, or an encrypted export
 * all fail eventually, but only after a long wait and a real API call.
 *
 * The magic bytes matter more than they look. `file.type` is supplied by the
 * browser - absent on some, trivially forged by anything that is not a browser -
 * so it says what the client claims, not what the bytes are.
 */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInspection> {
  if (bytes.length < PDF_MAGIC.length) {
    return { ok: false, reason: "That file is empty." };
  }

  const startsWithMagic = PDF_MAGIC.every((byte, i) => bytes[i] === byte);
  if (!startsWithMagic) {
    return {
      ok: false,
      reason: "That file is not a PDF, whatever its name says.",
    };
  }

  // Everything that touches the document structure sits inside one try.
  //
  // `load` succeeding does not mean the file is sound: a truncated PDF parses
  // far enough to produce a document, then throws from getPageCount() with
  // "Cannot read properties of undefined (reading 'Pages')" - a 500 on an
  // upload that should simply be refused.
  let encrypted: boolean;
  let pageCount: number;
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    encrypted = doc.isEncrypted;
    pageCount = doc.getPageCount();
  } catch {
    return {
      ok: false,
      reason: "That PDF could not be opened - it may be damaged.",
    };
  }

  if (encrypted) {
    return {
      ok: false,
      reason:
        "That PDF is password-protected. Save an unprotected copy and try again.",
    };
  }

  if (pageCount === 0) {
    return { ok: false, reason: "That PDF has no pages." };
  }

  if (pageCount > MAX_PDF_PAGES) {
    return {
      ok: false,
      reason:
        `That PDF has ${pageCount} pages, and recipes are expected to be at ` +
        `most ${MAX_PDF_PAGES}. Split out the pages you want and upload those.`,
    };
  }

  return { ok: true, pageCount };
}
