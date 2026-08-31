import { looksLikeHeif } from "./image-inspect";

/**
 * Turn an iPhone photo into something the rest of the app can read.
 *
 * HEIC is what an iPhone stores by default, and nothing downstream accepts it:
 * not the Claude API, not `inspectImage`, and not most browsers' own decoders.
 * iOS usually transcodes to JPEG when a file input asks for JPEG - but only
 * usually. Chrome on iOS, the Files app, Android, and a HEIC that reached a
 * laptop by AirDrop all hand over the original, and until now that produced a
 * polite refusal at the end of an upload somebody had already waited for.
 *
 * The decoder is about three megabytes of WebAssembly, so it is imported only
 * once a file has already been identified as HEIC from its first twelve bytes.
 * Somebody uploading JPEGs never downloads it.
 */

/** How many bytes are needed to recognise the container. */
const SNIFF_BYTES = 12;

/**
 * The same file, or a JPEG of it.
 *
 * Deliberately forgiving: a file that cannot be converted comes back untouched
 * rather than throwing, and the server then identifies it by its bytes and
 * explains itself. A conversion failure should cost the clear error message,
 * not replace it with a worse one.
 */
export async function heicToJpeg(file: File): Promise<File> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  if (!looksLikeHeif(head)) return file;

  try {
    const { heicTo } = await import("heic-to/next");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
    return new File([blob], renameToJpg(file.name), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** "IMG_4032.HEIC" -> "IMG_4032.jpg", so the stored card is named honestly. */
function renameToJpg(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}
