import { prisma } from "./db";
import { normaliseName } from "./grocery";

export type PantryItemRecord = {
  id: string;
  name: string;
  normalisedName: string;
};

/**
 * Things this household always has in, and so never needs to buy.
 *
 * Held per household rather than per person: one kitchen, one salt cellar. Two
 * families both keeping olive oil in is the normal case, which is why the
 * uniqueness is on (household, name) rather than on the name alone.
 */
export async function listPantryItems(
  householdId: string,
): Promise<PantryItemRecord[]> {
  const rows = await prisma.pantryItem.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, normalisedName: true },
  });
  return rows;
}

export type AddPantryResult =
  { ok: true; item: PantryItemRecord } | { ok: false; error: string };

/**
 * Add a staple.
 *
 * Adding something already there is a no-op rather than an error: the desired
 * state is already true, and two people tidying the pantry list on a Sunday
 * should not see a failure for agreeing with each other.
 */
export async function addPantryItem(
  name: string,
  householdId: string,
  createdById: string,
): Promise<AddPantryResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name the item first." };
  if (trimmed.length > 120) {
    return { ok: false, error: "That name is too long for a pantry item." };
  }

  const normalisedName = normaliseName(trimmed);

  const existing = await prisma.pantryItem.findUnique({
    where: { householdId_normalisedName: { householdId, normalisedName } },
    select: { id: true, name: true, normalisedName: true },
  });
  if (existing) return { ok: true, item: existing };

  try {
    const item = await prisma.pantryItem.create({
      data: { name: trimmed, normalisedName, householdId, createdById },
      select: { id: true, name: true, normalisedName: true },
    });
    return { ok: true, item };
  } catch (error) {
    // P2002 means someone added the same staple a moment earlier. The unique
    // index is what settles that race; the outcome they wanted has happened.
    if (isUniqueViolation(error)) {
      const item = await prisma.pantryItem.findUnique({
        where: { householdId_normalisedName: { householdId, normalisedName } },
        select: { id: true, name: true, normalisedName: true },
      });
      if (item) return { ok: true, item };
    }
    throw error;
  }
}

/**
 * Take a staple back off the list, so it starts appearing on shopping again.
 *
 * Scoped by household as well as id: the id comes from a form post, and a
 * delete that trusted it alone would let one family clear another's pantry. A
 * row belonging to someone else matches nothing, which is the same outcome as
 * a row already gone.
 */
export async function removePantryItem(
  id: string,
  householdId: string,
): Promise<void> {
  await prisma.pantryItem.deleteMany({ where: { id, householdId } });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
