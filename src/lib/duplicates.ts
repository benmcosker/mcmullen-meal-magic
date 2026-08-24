import { createHash } from "node:crypto";

import { prisma } from "./db";

export type ExistingRecipe = { id: string; title: string };

/** SHA-256 of a file's bytes, hex encoded. */
export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Has this exact file been uploaded before?
 *
 * Checked before extraction rather than after, which is the whole point: a
 * second upload of the same PDF costs nothing instead of a slow, billable model
 * call whose result is thrown away.
 */
export async function findRecipeByPdfHash(
  pdfSha256: string,
): Promise<ExistingRecipe | null> {
  return prisma.recipe.findUnique({
    where: { pdfSha256 },
    select: { id: true, title: true },
  });
}

/**
 * How alike two titles must be before it is worth interrupting someone.
 *
 * Tuned against the cases that matter: "Chicken Piccata" vs "Chicken Piccata!"
 * should warn, "Chicken Piccata" vs "Chicken Soup" should not. Lower values
 * start flagging every chicken dish in the library, which trains people to
 * dismiss the warning without reading it.
 */
export const TITLE_SIMILARITY_THRESHOLD = 0.55;

/**
 * Recipes whose titles look like this one.
 *
 * A different PDF of the same dish, or one typed in by hand, has no bytes in
 * common with anything - only the name gives it away. This is a warning rather
 * than a block: two genuinely different recipes can share a name, and the
 * household is better placed than a similarity score to judge which.
 *
 * Uses the pg_trgm index already on recipe.title, so it costs an index lookup
 * rather than a scan.
 */
export async function findSimilarlyTitled(
  title: string,
  options: { excludeId?: string; limit?: number } = {},
): Promise<ExistingRecipe[]> {
  const trimmed = title.trim();
  if (!trimmed) return [];

  const rows = await prisma.$queryRaw<
    { id: string; title: string; score: number }[]
  >`
    SELECT "id", "title", similarity("title", ${trimmed})::float8 AS score
    FROM "recipe"
    WHERE similarity("title", ${trimmed}) >= ${TITLE_SIMILARITY_THRESHOLD}
      AND ("id" <> ${options.excludeId ?? ""})
    ORDER BY score DESC
    LIMIT ${options.limit ?? 3}
  `;

  return rows.map(({ id, title: t }) => ({ id, title: t }));
}
