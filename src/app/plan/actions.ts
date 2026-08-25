"use server";

import { revalidatePath } from "next/cache";

import type { MealSlot, ShoppingProvider } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { aggregateIngredients, getWeekPlan, weekStartOf } from "@/lib/grocery";
import { getProvider, type HandoffResult } from "@/lib/shopping";
import { textShoppingList } from "@/lib/sms/shopping-list";
import { requireHousehold } from "@/lib/session";

export async function setPlannedMealAction(input: {
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  servings: number;
}): Promise<void> {
  const { householdId } = await requireHousehold();

  const date = new Date(`${input.date}T00:00:00.000Z`);

  if (!input.recipeId) {
    // Clearing a slot: delete rather than storing an empty row.
    await prisma.plannedMeal.deleteMany({
      where: { householdId, date, slot: input.slot },
    });
  } else {
    // Any recipe in the library can be planned, whoever added it - that is
    // what sharing the library is for. It still has to exist: the id comes
    // from a form post, and a planned meal pointing at nothing shows up as a
    // blank evening rather than an error.
    const recipe = await prisma.recipe.findUnique({
      where: { id: input.recipeId },
      select: { id: true },
    });
    if (!recipe) return;

    await prisma.plannedMeal.upsert({
      where: {
        householdId_date_slot: { householdId, date, slot: input.slot },
      },
      create: {
        householdId,
        date,
        slot: input.slot,
        recipeId: input.recipeId,
        servings: input.servings,
      },
      update: { recipeId: input.recipeId, servings: input.servings },
    });
  }

  revalidatePath("/plan");
}

/**
 * Hand this week's list to a shop.
 *
 * What comes back depends on the provider: Instacart returns a prepared cart,
 * Amazon returns per-ingredient search links because it has no ordering API.
 * The result type keeps those distinct so the UI cannot present one as the
 * other.
 */
export async function sendWeekToProviderAction(
  weekStartIso: string,
  providerId: ShoppingProvider,
): Promise<HandoffResult> {
  const user = await requireHousehold();

  const weekStart = weekStartOf(new Date(weekStartIso));
  const meals = await getWeekPlan(weekStart, user.householdId);
  const lines = aggregateIngredients(meals);

  if (lines.length === 0) {
    return {
      ok: false,
      error: "Nothing planned this week, so there is nothing to send.",
    };
  }

  const result = await getProvider(providerId).handoff(lines, weekStart);
  if (!result.ok) return result;

  // Record the hand-off. The shop owns everything after this point, so this is
  // the last thing we can know about an order.
  await prisma.shoppingHandoff.create({
    data: {
      provider: providerId,
      weekStart,
      url: result.kind === "cart" ? result.url : null,
      itemCount: lines.length,
      householdId: user.householdId,
      createdById: user.id,
    },
  });

  revalidatePath("/plan");
  return result;
}

export type TextListActionResult =
  { ok: true; message: string } | { ok: false; error: string };

/**
 * Text this week's shopping to everyone in the household who has a number.
 *
 * The week is taken from the client, the list is not: what gets sent is what
 * the plan says now, rather than what a page rendered some minutes ago and may
 * have been left open through.
 */
export async function textShoppingListAction(
  weekStartIso: string,
): Promise<TextListActionResult> {
  const { householdId } = await requireHousehold();
  const weekStart = weekStartOf(new Date(weekStartIso));

  let result;
  try {
    result = await textShoppingList({
      householdId,
      weekStart,
      weekLabel: `week of ${weekStart.toISOString().slice(0, 10)}`,
    });
  } catch (error) {
    console.error("[sms] could not text the shopping list", error);
    return { ok: false, error: "The message could not be sent. Try again." };
  }

  if (!result.ok) return result;

  const parts = result.parts === 1 ? "" : ` in ${result.parts} messages`;
  const sent = `Sent to ${formatNames(result.delivered)}${parts}.`;
  const failed = result.failed.length
    ? ` Could not reach ${formatNames(result.failed.map((f) => f.name))}: ${result.failed[0].error}`
    : "";
  const skipped = result.skipped.length
    ? ` ${formatNames(result.skipped)} ${result.skipped.length === 1 ? "has" : "have"} no number saved.`
    : "";

  return { ok: true, message: `${sent}${failed}${skipped}` };
}

/** "Ben", "Ben and Laura", "Ben, Laura and Pat". */
function formatNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "nobody";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
