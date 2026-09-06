import { prisma } from "./db";
import type { GroceryLine } from "./grocery";
import { normaliseName } from "./grocery";

export type ExtraItemRecord = {
  id: string;
  name: string;
  amount: string | null;
};

/** The longest name and amount worth storing, matching the pantry's limit. */
const MAX_NAME = 120;
const MAX_AMOUNT = 40;

/**
 * The things a week needs that no recipe asked for.
 *
 * Held per household and per week, like the plan and unlike the pantry. Next
 * week starts empty, which is right for kitchen roll and wrong for salt - salt
 * is what the pantry is for.
 */
export async function listExtraItems(
  weekStart: Date,
  householdId: string,
): Promise<ExtraItemRecord[]> {
  return prisma.extraItem.findMany({
    where: { householdId, weekStart },
    orderBy: { name: "asc" },
    select: { id: true, name: true, amount: true },
  });
}

export type AddExtraResult =
  { ok: true; item: ExtraItemRecord } | { ok: false; error: string };

/**
 * Put something on this week's list by hand.
 *
 * Adding a name already on the week updates its amount rather than failing or
 * making a second row: typing "milk" again having remembered you need two is
 * a correction, and the useful outcome is one line reading two.
 */
export async function addExtraItem(
  input: { name: string; amount?: string | null },
  weekStart: Date,
  householdId: string,
  createdById: string,
): Promise<AddExtraResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name the item first." };
  if (name.length > MAX_NAME) {
    return { ok: false, error: "That name is too long for a shopping list." };
  }

  const amount = input.amount?.trim() || null;
  if (amount && amount.length > MAX_AMOUNT) {
    return { ok: false, error: "That amount is too long." };
  }

  const normalisedName = normaliseName(name);

  const item = await prisma.extraItem.upsert({
    where: {
      householdId_normalisedName_weekStart: {
        householdId,
        normalisedName,
        weekStart,
      },
    },
    create: {
      name,
      amount,
      normalisedName,
      weekStart,
      householdId,
      createdById,
    },
    update: { name, amount },
    select: { id: true, name: true, amount: true },
  });

  return { ok: true, item };
}

/**
 * Take a hand-added item back off the week.
 *
 * Scoped by household as well as id, for the same reason every other delete
 * here is: the id arrives from a form post, and one that matched on its own
 * would let one family clear another's list.
 */
export async function removeExtraItem(
  id: string,
  householdId: string,
): Promise<void> {
  await prisma.extraItem.deleteMany({ where: { id, householdId } });
}

/**
 * Hand-added items as shopping-list lines.
 *
 * They carry no quantity of their own. A typed amount is free text - "a big
 * bag" is a perfectly good answer and not a number - so it is shown as written
 * and never scaled or added up. That is also why these lines do not merge with
 * a recipe's: there is nothing to merge arithmetically, and a "milk" you asked
 * for by hand sitting on its own line beneath the milk three dinners need is
 * clearer than one line that could not say how much of it was your idea.
 */
export function extraLines(items: ExtraItemRecord[]): GroceryLine[] {
  return items.map((item) => ({
    name: item.name,
    quantity: null,
    unit: null,
    fromRecipes: [],
    recipeId: null,
    extraId: item.id,
    amountLabel: item.amount,
  }));
}

/**
 * The week's shopping: what the recipes need, plus what was added by hand.
 *
 * Sorted together rather than appended as a block, because the list is walked
 * by aisle - a lemon someone remembered belongs beside the lemons three
 * dinners need, not in a postscript under the bottom of the list.
 */
export function withExtras(
  lines: GroceryLine[],
  items: ExtraItemRecord[],
): GroceryLine[] {
  return [...lines, ...extraLines(items)].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
