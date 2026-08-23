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
 * Which blob store the app writes to.
 *
 * Authoritative now that the token is passed explicitly at every call site -
 * before that, this reported the token's store while the SDK was quietly using
 * whatever BLOB_STORE_ID named.
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
      // Passed explicitly, and this matters. Left to resolve itself, the SDK
      // tries OIDC first: on Vercel a VERCEL_OIDC_TOKEN is always injected, so
      // if a BLOB_STORE_ID is also set it authenticates against *that* store
      // and never reads BLOB_READ_WRITE_TOKEN. A stale BLOB_STORE_ID left
      // behind by a disconnected store therefore silently redirects every
      // upload, and the error names the wrong store's configuration. Passing
      // the token short-circuits that: whatever the token says, wins.
      token: process.env.BLOB_READ_WRITE_TOKEN,
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
      // Same reasoning as storeFile: name the store via the token, so a delete
      // cannot go to a different store than the write did.
      await del(urlOrPathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
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
