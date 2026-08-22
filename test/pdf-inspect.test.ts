import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { MAX_PDF_PAGES, inspectPdf } from "@/lib/pdf-inspect";

async function pdfWithPages(count: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < count; i++) {
    doc
      .addPage([612, 792])
      .drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 12, font });
  }
  return doc.save();
}

describe("inspectPdf", () => {
  it("accepts an ordinary recipe PDF", async () => {
    const result = await inspectPdf(await pdfWithPages(2));
    expect(result.ok).toBe(true);
    expect(result.ok && result.pageCount).toBe(2);
  });

  it("rejects a file that is not a PDF, whatever it is named", async () => {
    // A renamed .docx, or an HTML error page saved as .pdf, arrives looking
    // plausible to file.type. Only the leading bytes settle it.
    const result = await inspectPdf(new TextEncoder().encode("PK not a pdf"));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not a PDF/i);
  });

  it("rejects an empty file", async () => {
    const result = await inspectPdf(new Uint8Array());
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/empty/i);
  });

  it("rejects a file with the right header but damaged contents", async () => {
    const result = await inspectPdf(
      new TextEncoder().encode("%PDF-1.7 then rubbish"),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(
      /could not be opened|damaged/i,
    );
  });

  it("rejects a PDF longer than a recipe could plausibly be", async () => {
    const result = await inspectPdf(await pdfWithPages(MAX_PDF_PAGES + 1));
    expect(result.ok).toBe(false);
    // The message should say how long it was and what the limit is, so the
    // person knows what to do rather than just that it failed.
    expect(result.ok === false && result.reason).toMatch(
      new RegExp(`${MAX_PDF_PAGES + 1} pages`),
    );
  });

  it("accepts a PDF exactly at the limit", async () => {
    expect((await inspectPdf(await pdfWithPages(MAX_PDF_PAGES))).ok).toBe(true);
  });

  it("accepts a real PDF carrying an embedded photo", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const jpg = await doc.embedJpg(
      new Uint8Array(
        readFileSync(join(process.cwd(), "test/fixtures/photo.jpg")),
      ),
    );
    page.drawImage(jpg, { x: 50, y: 400, width: 300, height: 225 });
    expect((await inspectPdf(await doc.save())).ok).toBe(true);
  });
});
