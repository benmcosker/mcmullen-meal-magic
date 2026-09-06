import { listExtraItems, withExtras, type ExtraItemRecord } from "./extras";
import {
  aggregateIngredients,
  buildExclusions,
  getWeekPlan,
  getWeeklySkips,
  type GroceryLine,
  type PlannedMealWithRecipe,
} from "./grocery";
import { listPantryItems } from "./pantry";

/**
 * Assembling the week's shopping, in one place.
 *
 * Three things need this list and none of them may disagree: the planner
 * renders it, the shop hand-off sends it, and the text message is read from it
 * in the aisle. They did disagree - the hand-off built its lines without
 * exclusions, so a pantry staple you never buy and a line you had already
 * ticked off both went to Amazon anyway, while the same week texted correctly.
 * Nothing announced that; the two lists were simply different.
 *
 * So the assembly lives here and the callers do not repeat it. The order
 * matters and is the whole content of the function: exclusions are applied to
 * what the recipes asked for, and hand-added items are added afterwards,
 * because they are not subject to the pantry - typing "olive oil" on the week
 * is what you meant even when olive oil is a staple.
 */
export function buildShoppingList(parts: {
  meals: PlannedMealWithRecipe[];
  pantry: { normalisedName: string }[];
  skips: { normalisedName: string }[];
  extras: ExtraItemRecord[];
}): GroceryLine[] {
  return withExtras(
    aggregateIngredients(
      parts.meals,
      buildExclusions(parts.pantry, parts.skips),
    ),
    parts.extras,
  );
}

/**
 * The same list, fetched.
 *
 * For callers that hold nothing yet - the two server actions, which take a
 * week from the client and deliberately read the plan again rather than trust
 * a list a page rendered some minutes ago. The planner page already has every
 * piece for its own rendering and calls `buildShoppingList` instead, rather
 * than fetching all four a second time.
 */
export async function weekShoppingList(
  weekStart: Date,
  householdId: string,
): Promise<GroceryLine[]> {
  const [meals, pantry, skips, extras] = await Promise.all([
    getWeekPlan(weekStart, householdId),
    listPantryItems(householdId),
    getWeeklySkips(weekStart, householdId),
    listExtraItems(weekStart, householdId),
  ]);

  return buildShoppingList({ meals, pantry, skips, extras });
}
