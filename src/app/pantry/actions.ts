"use server";

import { revalidatePath } from "next/cache";

import { addPantryItem, removePantryItem } from "@/lib/pantry";
import { requireHousehold } from "@/lib/session";

export type PantryActionResult = { ok: true } | { ok: false; error: string };

export async function addPantryItemAction(
  name: string,
): Promise<PantryActionResult> {
  const user = await requireHousehold();

  const result = await addPantryItem(name, user.householdId, user.id);
  if (!result.ok) return result;

  // The plan's shopping list is derived from this, so it goes stale too.
  revalidatePath("/pantry");
  revalidatePath("/plan");
  return { ok: true };
}

export async function removePantryItemAction(id: string): Promise<void> {
  const user = await requireHousehold();
  await removePantryItem(id, user.householdId);
  revalidatePath("/pantry");
  revalidatePath("/plan");
}
