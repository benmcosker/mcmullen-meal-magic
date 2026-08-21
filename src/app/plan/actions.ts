"use server";

import { revalidatePath } from "next/cache";

import type { MealSlot, ShoppingProvider } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { aggregateIngredients, getWeekPlan, weekStartOf } from "@/lib/grocery";
import { getProvider, type HandoffResult } from "@/lib/shopping";
import { requireUser } from "@/lib/session";

export async function setPlannedMealAction(input: {
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  servings: number;
}): Promise<void> {
  await requireUser();

  const date = new Date(`${input.date}T00:00:00.000Z`);

  if (!input.recipeId) {
    // Clearing a slot: delete rather than storing an empty row.
    await prisma.plannedMeal.deleteMany({ where: { date, slot: input.slot } });
  } else {
    await prisma.plannedMeal.upsert({
      where: { date_slot: { date, slot: input.slot } },
      create: {
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
  const user = await requireUser();

  const weekStart = weekStartOf(new Date(weekStartIso));
  const meals = await getWeekPlan(weekStart);
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
      createdById: user.id,
    },
  });

  revalidatePath("/plan");
  return result;
}
