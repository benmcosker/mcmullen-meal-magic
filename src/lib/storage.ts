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

/**
 * Which blob store the configured token actually points at.
 *
 * Vercel's tokens are shaped `vercel_blob_rw_<storeId>_<secret>`, so the store
 * is identifiable without revealing the credential - the secret tail is never
 * returned. Worth having because two tokens for two stores look identical at a
 * glance, and pasting the wrong one produces an error about the store's
 * configuration rather than about the token, which sends you to the wrong
 * dashboard page.
 */
export function blobStoreId(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  const parts = token.split("_");
  // vercel, blob, rw, <storeId>, <secret...>
  return parts.length >= 5 && parts[3] ? parts[3] : null;
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
