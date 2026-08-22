import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { del, put } from "@vercel/blob";

/**
 * Where uploaded PDFs and dish photos live.
 *
 * Vercel Blob in production; a directory under ./public in development, so the
 * app is runnable without a Blob token or any cloud account. The local driver
 * is not suitable for deployment - serverless filesystems are ephemeral and not
 * shared between instances - which is why the token's presence, not NODE_ENV,
 * selects the driver.
 */
export type StoredFile = { url: string; pathname: string };

const LOCAL_DIR = join(process.cwd(), "public", "uploads");

export function usingBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storeFile(
  data: Buffer | Uint8Array,
  filename: string,
  contentType: string,
): Promise<StoredFile> {
  // Keep the extension, replace the name: uploads are attacker-controlled text
  // and end up in a URL.
  const extension = filename.includes(".") ? filename.split(".").pop() : "bin";
  const safeName = `${randomUUID()}.${extension}`;

  if (usingBlobStorage()) {
    const blob = await put(safeName, Buffer.from(data), {
      access: "public",
      contentType,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, safeName), Buffer.from(data));
  return { url: `/uploads/${safeName}`, pathname: safeName };
}

/**
 * Remove a stored file.
 *
 * Used when an extraction is discarded before it is saved. Without this, every
 * abandoned upload leaves a PDF and a photo behind that nothing will ever
 * reference - invisible, billable, and impossible to attribute later.
 *
 * Failure is swallowed on purpose: a file that is already gone, or a blob store
 * that is briefly unavailable, must not turn "discard this draft" into an error
 * the person has to think about.
 */
export async function deleteFile(urlOrPathname: string): Promise<void> {
  if (!urlOrPathname) return;

  try {
    if (usingBlobStorage()) {
      await del(urlOrPathname);
      return;
    }

    // Local driver: URLs look like /uploads/<name>. Take only the basename, so
    // a crafted value cannot walk out of the uploads directory.
    const name = basename(urlOrPathname);
    if (!name || name === "." || name === "..") return;
    await unlink(join(LOCAL_DIR, name));
  } catch {
    // Nothing actionable: see above.
  }
}
