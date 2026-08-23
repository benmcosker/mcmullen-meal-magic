import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, inspectImage } from "@/lib/image-inspect";

const bytes = (...values: number[]) => new Uint8Array(values);

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const WEBP = bytes(...ascii("RIFF"), 0x24, 0x01, 0x00, 0x00, ...ascii("WEBP"));
const HEIC = bytes(0, 0, 0, 0x18, ...ascii("ftyp"), ...ascii("heic"), 0, 0);

describe("inspectImage", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg", "jpg"],
    ["PNG", PNG, "image/png", "png"],
    ["GIF", GIF, "image/gif", "gif"],
    ["WebP", WEBP, "image/webp", "webp"],
  ] as const)("accepts a %s and names its type", (_, data, type, extension) => {
    const result = inspectImage(data);
    expect(result.ok).toBe(true);
    expect(result.ok && result.contentType).toBe(type);
    // The extension decides the stored filename, and a wrong one serves a
    // valid image under a type the browser refuses to render.
    expect(result.ok && result.extension).toBe(extension);
  });

  it("identifies WebP despite the size bytes in the middle", () => {
    // Those four bytes are the file length and differ per image, so a naive
    // prefix comparison would reject every WebP but the one it was written for.
    const other = bytes(
      ...ascii("RIFF"),
      0xff,
      0xee,
      0x01,
      0x00,
      ...ascii("WEBP"),
    );
    expect(inspectImage(other).ok).toBe(true);
  });

  it("rejects a file that is not an image, whatever it is named", () => {
    const result = inspectImage(new TextEncoder().encode("%PDF-1.7"));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/not an image/i);
  });

  it("rejects an empty file", () => {
    const result = inspectImage(new Uint8Array());
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/empty/i);
  });

  it("names HEIC specifically rather than calling a photo not an image", () => {
    // The likeliest rejection there is: an iPhone photo. Telling someone their
    // photo is not an image is both untrue and useless.
    const result = inspectImage(HEIC);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/HEIC/);
    expect(result.ok === false && result.reason).toMatch(/JPEG/);
  });

  it("refuses an image past the size limit", () => {
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(JPEG);
    const result = inspectImage(huge);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/larger than/i);
  });

  it("accepts an image exactly at the limit", () => {
    const atLimit = new Uint8Array(MAX_IMAGE_BYTES);
    atLimit.set(JPEG);
    expect(inspectImage(atLimit).ok).toBe(true);
  });

  it("is not fooled by a truncated signature", () => {
    // Two of PNG's eight magic bytes. Comparing only what happens to be
    // present would let this through and store an unopenable file.
    expect(inspectImage(bytes(0x89, 0x50)).ok).toBe(false);
  });
});
