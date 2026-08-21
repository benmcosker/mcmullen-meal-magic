"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { aggregateIngredients, getWeekPlan, weekStartOf } from "@/lib/grocery";
import {
  buildShoppingListPayload,
  createShoppingListPage,
} from "@/lib/instacart";
import { requireUser } from "@/lib/session";
import type { MealSlot } from "@/generated/prisma/enums";

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

export type SendToInstacartResult =
  { ok: true; url: string; itemCount: number } | { ok: false; error: string };

export async function sendWeekToInstacartAction(
  weekStartIso: string,
): Promise<SendToInstacartResult> {
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

  const label = weekStart.toISOString().slice(0, 10);
  const result = await createShoppingListPage(
    buildShoppingListPayload(lines, `Meal Magic — week of ${label}`),
  );

  if (!result.ok) return result;

  // Record the hand-off. Instacart owns everything after this point, so this
  // is the last thing we can know about the order.
  await prisma.instacartHandoff.create({
    data: {
      weekStart,
      url: result.url,
      itemCount: lines.length,
      createdById: user.id,
    },
  });

  revalidatePath("/plan");
  return { ok: true, url: result.url, itemCount: lines.length };
}
