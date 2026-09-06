import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  addExtraItem,
  extraLines,
  listExtraItems,
  removeExtraItem,
  withExtras,
  type ExtraItemRecord,
} from "@/lib/extras";
import type { GroceryLine } from "@/lib/grocery";
import { formatAmount, formatAsPlainText } from "@/lib/shopping/format";

import { makeHousehold, resetDatabase as reset } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

const WEEK = new Date("2026-09-07T00:00:00.000Z");
const NEXT_WEEK = new Date("2026-09-14T00:00:00.000Z");

function line(over: Partial<GroceryLine> = {}): GroceryLine {
  return {
    name: "chicken",
    quantity: 2,
    unit: "lb",
    fromRecipes: ["Roast chicken"],
    recipeId: "r1",
    ...over,
  };
}

function record(over: Partial<ExtraItemRecord> = {}): ExtraItemRecord {
  return { id: "x1", name: "Kitchen roll", amount: null, ...over };
}

describe("extraLines", () => {
  it("carries the id, so a row can offer to take it off again", () => {
    const [only] = extraLines([record()]);
    expect(only.extraId).toBe("x1");
    expect(only.name).toBe("Kitchen roll");
  });

  it("has no quantity of its own and claims no recipe", () => {
    const [only] = extraLines([record({ amount: "2" })]);
    expect(only.quantity).toBeNull();
    expect(only.unit).toBeNull();
    expect(only.recipeId).toBeNull();
    expect(only.fromRecipes).toEqual([]);
  });

  it("keeps a hand-written amount exactly as typed", () => {
    const [only] = extraLines([record({ amount: "a big bag" })]);
    expect(only.amountLabel).toBe("a big bag");
    expect(formatAmount(only)).toBe("a big bag");
  });
});

describe("withExtras", () => {
  it("sorts hand-added items in among the recipe's, not after them", () => {
    const merged = withExtras(
      [line({ name: "apples" }), line({ name: "zucchini" })],
      [record({ name: "bread" })],
    );
    expect(merged.map((l) => l.name)).toEqual(["apples", "bread", "zucchini"]);
  });

  /*
   * A hand-added line sits beside a recipe's rather than merging into it.
   * There is no number to add - the amount is free text - and a single line
   * could not say how much of it was somebody's own idea.
   */
  it("leaves a name that also comes from a recipe on its own line", () => {
    const merged = withExtras(
      [line({ name: "milk" })],
      [record({ name: "milk" })],
    );
    expect(merged).toHaveLength(2);
    expect(merged.filter((l) => l.extraId)).toHaveLength(1);
  });

  it("reaches the plain text the shop and the text message both use", () => {
    const text = formatAsPlainText(
      withExtras([], [record({ name: "Kitchen roll", amount: "2" })]),
    );
    expect(text).toContain("2 Kitchen roll");
  });
});

describe.skipIf(!hasDb)("extra items in the database", () => {
  beforeEach(reset);
  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("belongs to one week, so next week starts clean", async () => {
    const { householdId, userId } = await makeHousehold();
    await addExtraItem({ name: "Kitchen roll" }, WEEK, householdId, userId);

    expect(await listExtraItems(WEEK, householdId)).toHaveLength(1);
    expect(await listExtraItems(NEXT_WEEK, householdId)).toHaveLength(0);
  });

  it("updates the amount rather than making a second row", async () => {
    const { householdId, userId } = await makeHousehold();
    await addExtraItem(
      { name: "Milk", amount: "1" },
      WEEK,
      householdId,
      userId,
    );
    await addExtraItem(
      { name: "milk", amount: "2" },
      WEEK,
      householdId,
      userId,
    );

    const items = await listExtraItems(WEEK, householdId);
    expect(items).toHaveLength(1);
    expect(items[0].amount).toBe("2");
    // The name is stored as last typed, so a correction to the capital sticks.
    expect(items[0].name).toBe("milk");
  });

  it("refuses a blank name and an over-long one", async () => {
    const { householdId, userId } = await makeHousehold();

    expect(
      await addExtraItem({ name: "   " }, WEEK, householdId, userId),
    ).toEqual({
      ok: false,
      error: "Name the item first.",
    });
    const long = await addExtraItem(
      { name: "x".repeat(121) },
      WEEK,
      householdId,
      userId,
    );
    expect(long.ok).toBe(false);
    expect(await listExtraItems(WEEK, householdId)).toHaveLength(0);
  });

  it("keeps two households' lists apart", async () => {
    const a = await makeHousehold("A");
    const b = await makeHousehold("B");
    await addExtraItem({ name: "Kitchen roll" }, WEEK, a.householdId, a.userId);

    expect(await listExtraItems(WEEK, b.householdId)).toHaveLength(0);
  });

  it("will not let one household delete another's item", async () => {
    const a = await makeHousehold("A");
    const b = await makeHousehold("B");
    const added = await addExtraItem(
      { name: "Kitchen roll" },
      WEEK,
      a.householdId,
      a.userId,
    );
    if (!added.ok) throw new Error("setup failed");

    await removeExtraItem(added.item.id, b.householdId);
    expect(await listExtraItems(WEEK, a.householdId)).toHaveLength(1);

    await removeExtraItem(added.item.id, a.householdId);
    expect(await listExtraItems(WEEK, a.householdId)).toHaveLength(0);
  });
});
