"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { normaliseName, weekStartOf } from "@/lib/grocery";
import { addPantryItem, removePantryItem } from "@/lib/pantry";
import { requireHousehold } from "@/lib/session";

/**
 * "We already have milk" - for this week only.
 *
 * Next week it is back on the list, which is what you want for something you
 * ran out of. For something you always keep, the pantry is the right list;
 * `addToPantryAction` puts it there.
 */
export async function skipForWeekAction(
  name: string,
  weekStartIso: string,
): Promise<void> {
  const user = await requireHousehold();

  const trimmed = name.trim();
  if (!trimmed) return;

  const normalisedName = normaliseName(trimmed);
  const weekStart = weekStartOf(new Date(weekStartIso));

  try {
    await prisma.weeklySkip.create({
      data: {
        name: trimmed,
        normalisedName,
        weekStart,
        householdId: user.householdId,
        createdById: user.id,
      },
    });
  } catch (error) {
    // P2002 means someone ticked the same ingredient a moment earlier. The
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

/** Put a week's skipped ingredient back on the list. */
export async function unskipForWeekAction(id: string): Promise<void> {
  const user = await requireHousehold();
  await prisma.weeklySkip.deleteMany({
    where: { id, householdId: user.householdId },
  });
  revalidatePath("/plan");
}

/**
 * Promote an ingredient to a permanent staple, straight from the list it just
 * appeared on. The same thing the pantry page does, reachable at the moment
 * you notice.
 */
export async function addToPantryAction(name: string): Promise<void> {
  const user = await requireHousehold();
  await addPantryItem(name, user.householdId, user.id);
  revalidatePath("/plan");
  revalidatePath("/pantry");
}

export async function removeFromPantryAction(id: string): Promise<void> {
  const user = await requireHousehold();
  await removePantryItem(id, user.householdId);
  revalidatePath("/plan");
  revalidatePath("/pantry");
}
