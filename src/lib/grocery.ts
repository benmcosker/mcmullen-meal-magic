import { prisma } from "./db";

export type GroceryLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** Titles of the recipes that contributed to this line. */
  fromRecipes: string[];
  recipeId: string | null;
};

/** Monday 00:00 UTC of the week containing `date`. */
export function weekStartOf(date: Date): Date {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay: 0 = Sunday. Shift so Monday is the first day.
  const dayOffset = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - dayOffset);
  return utc;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Units that mean the same thing written different ways. Only exact synonyms
 * are folded together - no conversion between tbsp and cups, because getting
 * that wrong silently is worse than a shopping list with two lines on it.
 */
const unitAliases: Record<string, string> = {
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbs: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cups: "cup",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  ounce: "oz",
  ounces: "oz",
  milliliter: "ml",
  milliliters: "ml",
  liter: "l",
  liters: "l",
  clove: "cloves",
};

export function normaliseUnit(unit: string | null | undefined): string | null {
  const value = unit?.trim().toLowerCase();
  if (!value) return null;
  return unitAliases[value] ?? value;
}

function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Roll a week's planned meals up into a shopping list.
 *
 * Quantities are scaled by how many servings were planned against how many the
 * recipe makes, then merged across recipes when the name and unit agree.
 *
 * Lines with no quantity ("salt to taste") are kept separate from lines with
 * one, rather than being merged into a total that would be wrong: adding "2 tbsp
 * butter" to "butter, to taste" and printing "2 tbsp" loses the second
 * instruction entirely.
 */
export function aggregateIngredients(
  meals: {
    servings: number;
    recipe: {
      id: string;
      title: string;
      servings: number;
      ingredients: {
        name: string;
        quantity: number | null;
        unit: string | null;
      }[];
    } | null;
  }[],
): GroceryLine[] {
  const merged = new Map<string, GroceryLine>();

  for (const meal of meals) {
    if (!meal.recipe) continue;

    // A recipe claiming zero servings would divide by zero; treat it as 1.
    const recipeServings = meal.recipe.servings > 0 ? meal.recipe.servings : 1;
    const scale = meal.servings / recipeServings;

    for (const ingredient of meal.recipe.ingredients) {
      const unit = normaliseUnit(ingredient.unit);
      const name = normaliseName(ingredient.name);
      if (!name) continue;

      const hasQuantity =
        ingredient.quantity != null && ingredient.quantity > 0;
      // Unquantified lines get their own bucket so they cannot absorb a total.
      const key = `${name}|${unit ?? ""}|${hasQuantity ? "q" : "noq"}`;

      const existing = merged.get(key);
      const scaled = hasQuantity
        ? roundQuantity(ingredient.quantity! * scale)
        : null;

      if (!existing) {
        merged.set(key, {
          name: ingredient.name.trim(),
          quantity: scaled,
          unit: ingredient.unit?.trim() || null,
          fromRecipes: [meal.recipe.title],
          recipeId: meal.recipe.id,
        });
        continue;
      }

      if (scaled != null) {
        existing.quantity = roundQuantity((existing.quantity ?? 0) + scaled);
      }
      if (!existing.fromRecipes.includes(meal.recipe.title)) {
        existing.fromRecipes.push(meal.recipe.title);
      }
      // Once two recipes contribute, the line is no longer attributable to one.
      if (existing.recipeId !== meal.recipe.id) existing.recipeId = null;
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Two decimals is enough for a shopping list, and avoids 0.30000000000000004. */
function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100;
}

export type PlannedMealWithRecipe = Awaited<
  ReturnType<typeof getWeekPlan>
>[number];

/**
 * The single meal planned per day.
 *
 * The plan holds one meal a day and it is dinner. Querying that slot
 * explicitly keeps the grocery list honest: a row in another slot - left by
 * earlier data, or a future second-meal feature - would otherwise contribute
 * ingredients to the list while being invisible on the planner, which is a
 * confusing thing to debug from a shopping list that does not match the week.
 */
export const PLANNED_SLOT = "DINNER" as const;

export async function getWeekPlan(weekStart: Date) {
  return prisma.plannedMeal.findMany({
    where: {
      date: { gte: weekStart, lt: addDays(weekStart, 7) },
      slot: PLANNED_SLOT,
    },
    include: {
      recipe: {
        include: { ingredients: { orderBy: { position: "asc" } } },
      },
    },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  });
}
