"use server";

import { revalidatePath } from "next/cache";

import { addExtraItem, removeExtraItem } from "@/lib/extras";
import { weekStartOf } from "@/lib/grocery";
import { requireHousehold } from "@/lib/session";

export type ExtraActionResult = { ok: true } | { ok: false; error: string };

/**
 * Put something on the week's list that no recipe asked for.
 *
 * The week comes from the client because the planner can be looking at any
 * week; it is normalised here rather than trusted, so a hand-edited value
 * lands on a Monday like every other week does.
 */
export async function addExtraItemAction(
  input: { name: string; amount?: string | null },
  weekStartIso: string,
): Promise<ExtraActionResult> {
  const user = await requireHousehold();

  const result = await addExtraItem(
    input,
    weekStartOf(new Date(weekStartIso)),
    user.householdId,
    user.id,
  );
  if (!result.ok) return result;

  revalidatePath("/plan");
  return { ok: true };
}

export async function removeExtraItemAction(id: string): Promise<void> {
  const user = await requireHousehold();
  await removeExtraItem(id, user.householdId);
  revalidatePath("/plan");
}
