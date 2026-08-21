import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PDFDocument, StandardFonts } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { extractLargestJpeg } from "@/lib/pdf-images";

const fixtures = join(process.cwd(), "test/fixtures");

/**
 * Read a fixture as a standalone Uint8Array.
 *
 * readFileSync returns a Buffer that, for small files, is a view into a shared
 * 8KB pool at a non-zero byteOffset. Consumers that read from the underlying
 * ArrayBuffer rather than the view see the pool's contents instead of the file
 * - pdf-lib's embedJpg rejects such a buffer with "SOI not found". Copying
 * detaches it from the pool.
 */
function readFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

const photo = () => readFixture("photo.jpg");
const logo = () => readFixture("logo.jpg");

async function buildPdf(
  images: { bytes: Uint8Array; width: number; height: number }[],
  text = "Chicken Piccata",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 50, y: 740, size: 18, font });

  let y = 500;
  for (const image of images) {
    const embedded = await doc.embedJpg(image.bytes);
    page.drawImage(embedded, {
      x: 50,
      y,
      width: image.width,
      height: image.height,
    });
    y -= 120;
  }
  return doc.save();
}

describe("extractLargestJpeg", () => {
  let withPhoto: Uint8Array;

  beforeAll(async () => {
    withPhoto = await buildPdf([{ bytes: photo(), width: 320, height: 240 }]);
  });

  it("pulls a JPEG out of a PDF that has one", async () => {
    const image = await extractLargestJpeg(withPhoto);
    expect(image).not.toBeNull();
    expect(image!.contentType).toBe("image/jpeg");
    expect(image!.width).toBe(640);
    expect(image!.height).toBe(480);
  });

  it("returns bytes that are a valid JPEG file", async () => {
    const image = await extractLargestJpeg(withPhoto);
    // SOI marker at the start, EOI at the end - i.e. writable straight to disk.
    expect(image!.data[0]).toBe(0xff);
    expect(image!.data[1]).toBe(0xd8);
    expect(image!.data.at(-2)).toBe(0xff);
    expect(image!.data.at(-1)).toBe(0xd9);
  });

  it("returns null for a PDF with no images", async () => {
    const textOnly = await buildPdf([]);
    expect(await extractLargestJpeg(textOnly)).toBeNull();
  });

  it("ignores images too small to be a dish photo", async () => {
    const logoOnly = await buildPdf([{ bytes: logo(), width: 32, height: 32 }]);
    // The logo is 64x64 in pixel terms, below the 200px floor.
    expect(await extractLargestJpeg(logoOnly)).toBeNull();
  });

  it("picks the largest image when a PDF has several", async () => {
    const both = await buildPdf([
      { bytes: logo(), width: 32, height: 32 },
      { bytes: photo(), width: 320, height: 240 },
    ]);
    const image = await extractLargestJpeg(both);
    expect(image!.width).toBe(640);
  });

  it("returns null rather than throwing on bytes that are not a PDF", async () => {
    expect(await extractLargestJpeg(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});
