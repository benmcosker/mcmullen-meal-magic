"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { normaliseName, weekStartOf } from "@/lib/grocery";
import { requireUser } from "@/lib/session";

export type SkipScope = "WEEK" | "ALWAYS";

/**
 * Take an ingredient off the shopping list.
 *
 * WEEK covers "we already have milk"; ALWAYS covers pantry staples that pad a
 * list out and are never actually bought. Both are household-wide, like the
 * recipes themselves.
 */
export async function skipIngredientAction(
  name: string,
  scope: SkipScope,
  weekStartIso: string,
): Promise<void> {
  const user = await requireUser();

  const trimmed = name.trim();
  if (!trimmed) return;

  const normalisedName = normaliseName(trimmed);
  const weekStart =
    scope === "WEEK" ? weekStartOf(new Date(weekStartIso)) : null;

  // Not an upsert: Prisma's compound-unique `where` will not accept a null
  // weekStart, which is exactly the ALWAYS case. The partial unique index in
  // the migration is what actually enforces uniqueness there, and Prisma has
  // no way to address it - so look first, then insert, and let the index
  // settle a race.
  const existing = await prisma.skippedIngredient.findFirst({
    where: { normalisedName, weekStart },
  });
  if (existing) return;

  try {
    await prisma.skippedIngredient.create({
      data: {
        name: trimmed,
        normalisedName,
        scope,
        weekStart,
        createdById: user.id,
      },
    });
  } catch (error) {
    // P2002 means someone skipped the same ingredient a moment earlier. The
    // desired state is already true, so this is a double tap, not a failure.
    if (!(
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    )) {
      throw error;
    }
  }

  revalidatePath("/plan");
}

/** Put a skipped ingredient back on the list. */
export async function unskipIngredientAction(id: string): Promise<void> {
  await requireUser();
  await prisma.skippedIngredient.deleteMany({ where: { id } });
  revalidatePath("/plan");
}
