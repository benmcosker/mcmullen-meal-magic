/**
 * The image formats this app accepts, in one place.
 *
 * These are the formats a browser can reliably display *and* the formats the
 * Claude API will read as an image - two constraints that happen to coincide
 * on exactly this set. Anything added here has to satisfy both; see
 * `test/image-inspect.test.ts`, which pins the list to what the API documents.
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export type ImageInspection =
  | { ok: true; contentType: SupportedImageType; extension: string }
  | { ok: false; reason: string };

/**
 * Generous for a dish photo, tight enough that nobody uploads a RAW file.
 *
 * The browser downscales before sending, so anything arriving near this ceiling
 * either skipped that path or is not really a photo.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * The formats a browser can reliably display, identified by their leading
 * bytes rather than by what the upload claims.
 *
 * `file.type` comes from the client - absent on some browsers, trivially forged
 * by anything that is not one - so it describes an assertion, not the file. A
 * mislabelled upload that reaches storage becomes a permanently broken image on
 * a recipe page, which is a tedious thing to diagnose later.
 */
const SIGNATURES: {
  bytes: (number | null)[];
  contentType: SupportedImageType;
  extension: string;
}[] = [
  { bytes: [0xff, 0xd8, 0xff], contentType: "image/jpeg", extension: "jpg" },
  {
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    contentType: "image/png",
    extension: "png",
  },
  {
    bytes: [0x47, 0x49, 0x46, 0x38],
    contentType: "image/gif",
    extension: "gif",
  },
  // RIFF....WEBP - the four size bytes in the middle vary, so they are skipped.
  {
    bytes: [
      0x52,
      0x49,
      0x46,
      0x46,
      null,
      null,
      null,
      null,
      0x57,
      0x45,
      0x42,
      0x50,
    ],
    contentType: "image/webp",
    extension: "webp",
  },
];

/** ftyp brands that mean HEIC/HEIF, which browsers outside Safari cannot show. */
const HEIF_BRANDS = ["heic", "heix", "hevc", "heim", "heis", "hevm", "mif1"];

export function inspectImage(bytes: Uint8Array): ImageInspection {
  if (bytes.length === 0) return { ok: false, reason: "That file is empty." };

  if (bytes.length > MAX_IMAGE_BYTES) {
    const mb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    return { ok: false, reason: `That image is larger than ${mb} MB.` };
  }

  for (const signature of SIGNATURES) {
    if (bytes.length < signature.bytes.length) continue;
    const matches = signature.bytes.every(
      (byte, i) => byte === null || bytes[i] === byte,
    );
    if (matches) {
      return {
        ok: true,
        contentType: signature.contentType,
        extension: signature.extension,
      };
    }
  }

  // Named separately from the generic rejection. An iPhone photo is the most
  // likely thing to land here, and "that file is not an image" is both untrue
  // and unhelpful when the file is very much a photo.
  if (isHeif(bytes)) {
    return {
      ok: false,
      reason:
        "That looks like an iPhone HEIC photo, which most browsers cannot " +
        "display. Export or share it as JPEG and try again.",
    };
  }

  return {
    ok: false,
    reason: "That file is not an image, whatever its name says.",
  };
}

/** ISO base media: bytes 4-8 are "ftyp", 8-12 the brand. */
function isHeif(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  return ascii(4, 8) === "ftyp" && HEIF_BRANDS.includes(ascii(8, 12));
}
