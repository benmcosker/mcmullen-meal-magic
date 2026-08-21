import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

export type ExtractedImage = {
  data: Uint8Array;
  contentType: string;
  width: number;
  height: number;
};

/**
 * Pull the most photo-like image out of a PDF.
 *
 * Walks each page's XObject resources looking for image streams. Only JPEG
 * (DCTDecode) images are returned: their stream bytes are already a complete
 * JPEG file, so they can be written out directly. Other encodings - notably
 * FlateDecode - hold raw samples that would need colour-space handling and a
 * PNG encoder to reconstruct, which is a lot of machinery for the occasional
 * PDF. Recipe photos are overwhelmingly JPEG, so the trade is worth it; a
 * recipe whose photo we cannot decode simply arrives without one, and the
 * uploader can add it by hand.
 *
 * Returns the largest such image by pixel area, on the assumption that the dish
 * photo dwarfs any logo or icon. Returns null when the PDF has none.
 */
export async function extractLargestJpeg(
  pdfBytes: Uint8Array,
): Promise<ExtractedImage | null> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  } catch {
    // A PDF we cannot parse is not a reason to fail the whole upload.
    return null;
  }

  let best: ExtractedImage | null = null;

  for (const page of doc.getPages()) {
    const resources = page.node.Resources();
    const xObjects = resources?.get(PDFName.of("XObject"));
    const xObjectDict = xObjects ? doc.context.lookup(xObjects) : undefined;
    if (
      !xObjectDict ||
      typeof xObjectDict !== "object" ||
      !("entries" in xObjectDict)
    ) {
      continue;
    }

    const entries = (
      xObjectDict as { entries(): [unknown, unknown][] }
    ).entries();

    for (const [, ref] of entries) {
      const stream = doc.context.lookup(ref as never);
      if (!(stream instanceof PDFRawStream)) continue;

      const dict = stream.dict;
      const subtype = dict.get(PDFName.of("Subtype"));
      if (subtype?.toString() !== "/Image") continue;

      const filter = dict.get(PDFName.of("Filter"))?.toString() ?? "";
      if (!filter.includes("DCTDecode")) continue;

      const width = Number(dict.get(PDFName.of("Width"))?.toString() ?? 0);
      const height = Number(dict.get(PDFName.of("Height"))?.toString() ?? 0);

      // Skip anything too small to be a dish photo - icons, rules, bullets.
      if (width < 200 || height < 200) continue;

      if (!best || width * height > best.width * best.height) {
        best = {
          data: stream.getContents(),
          contentType: "image/jpeg",
          width,
          height,
        };
      }
    }
  }

  return best;
}
