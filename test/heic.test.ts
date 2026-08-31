import { afterEach, describe, expect, it, vi } from "vitest";

const heicTo = vi.hoisted(() => vi.fn());
vi.mock("heic-to/next", () => ({ heicTo }));

const { heicToJpeg } = await import("@/lib/heic");
const { looksLikeHeif } = await import("@/lib/image-inspect");

/** An ISO base-media header with the given brand, padded to something real. */
const heicBytes = (brand = "heic") =>
  new Uint8Array([
    0,
    0,
    0,
    0x18,
    ...[..."ftyp"].map((c) => c.charCodeAt(0)),
    ...[...brand].map((c) => c.charCodeAt(0)),
    ...new Array(32).fill(0),
  ]);

const jpegBytes = () =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(20).fill(0)]);

const asFile = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes as unknown as BlobPart], name, { type });

describe("heicToJpeg", () => {
  afterEach(() => heicTo.mockReset());

  it("leaves an ordinary photo alone, and never loads the decoder for one", async () => {
    // The decoder is three megabytes. Somebody who only ever uploads JPEGs
    // should never pay for it, which is the whole reason the bytes are sniffed
    // here rather than by asking the library.
    const file = asFile(jpegBytes(), "dinner.jpg", "image/jpeg");

    expect(await heicToJpeg(file)).toBe(file);
    expect(heicTo).not.toHaveBeenCalled();
  });

  it("converts a HEIC and renames it honestly", async () => {
    heicTo.mockResolvedValue(new Blob([jpegBytes()], { type: "image/jpeg" }));
    const file = asFile(heicBytes(), "IMG_4032.HEIC", "image/heic");

    const out = await heicToJpeg(file);

    expect(out).not.toBe(file);
    expect(out.name).toBe("IMG_4032.jpg");
    expect(out.type).toBe("image/jpeg");
    expect(heicTo).toHaveBeenCalledOnce();
  });

  it("recognises the other HEIF brands an iPhone writes", async () => {
    heicTo.mockResolvedValue(new Blob([jpegBytes()], { type: "image/jpeg" }));

    for (const brand of ["heix", "mif1", "heim"]) {
      const out = await heicToJpeg(asFile(heicBytes(brand), "p.heic", ""));
      expect(out.type).toBe("image/jpeg");
    }
  });

  it("hands back the original when the decoder cannot read it", async () => {
    // A conversion failure should cost the clear server-side error message,
    // not replace it with a worse one invented here.
    heicTo.mockRejectedValue(new Error("unsupported"));
    const file = asFile(heicBytes(), "broken.heic", "image/heic");

    expect(await heicToJpeg(file)).toBe(file);
  });

  it("does not trust the name or the declared type, only the bytes", async () => {
    // file.type comes from the client and a phone will happily call a JPEG
    // something else. The bytes are the only honest answer.
    const lying = asFile(jpegBytes(), "photo.heic", "image/heic");

    expect(await heicToJpeg(lying)).toBe(lying);
    expect(heicTo).not.toHaveBeenCalled();
  });

  it("gives a nameless file something to be called", async () => {
    heicTo.mockResolvedValue(new Blob([jpegBytes()], { type: "image/jpeg" }));

    const out = await heicToJpeg(asFile(heicBytes(), ".heic", "image/heic"));
    expect(out.name).toBe("photo.jpg");
  });
});

describe("looksLikeHeif", () => {
  it("wants ftyp and a HEIF brand, not one or the other", () => {
    expect(looksLikeHeif(heicBytes())).toBe(true);
    expect(looksLikeHeif(jpegBytes())).toBe(false);
    // An MP4 is the same container with a brand that is not HEIF.
    expect(looksLikeHeif(heicBytes("isom"))).toBe(false);
  });

  it("says no rather than throwing on a file too short to tell", () => {
    expect(looksLikeHeif(new Uint8Array([0, 0, 0]))).toBe(false);
    expect(looksLikeHeif(new Uint8Array())).toBe(false);
  });
});
