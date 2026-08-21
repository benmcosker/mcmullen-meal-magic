import { describe, expect, it } from "vitest";

import {
  addDays,
  aggregateIngredients,
  normaliseUnit,
  weekStartOf,
} from "@/lib/grocery";
import { buildShoppingListPayload } from "@/lib/instacart";

function meal(
  title: string,
  recipeServings: number,
  plannedServings: number,
  ingredients: { name: string; quantity: number | null; unit: string | null }[],
  id = title.toLowerCase(),
) {
  return {
    servings: plannedServings,
    recipe: { id, title, servings: recipeServings, ingredients },
  };
}

describe("weekStartOf", () => {
  it("returns the Monday of the week", () => {
    // 2026-08-21 is a Friday.
    expect(weekStartOf(new Date("2026-08-21T12:00:00Z")).toISOString()).toBe(
      "2026-08-17T00:00:00.000Z",
    );
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(weekStartOf(new Date("2026-08-23T12:00:00Z")).toISOString()).toBe(
      "2026-08-17T00:00:00.000Z",
    );
  });

  it("is idempotent on a Monday", () => {
    const monday = weekStartOf(new Date("2026-08-17T00:00:00Z"));
    expect(weekStartOf(monday).toISOString()).toBe(monday.toISOString());
  });

  it("crosses a month boundary correctly", () => {
    expect(weekStartOf(new Date("2026-09-02T09:00:00Z")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });
});

describe("addDays", () => {
  it("does not mutate its argument", () => {
    const start = new Date("2026-08-17T00:00:00Z");
    addDays(start, 7);
    expect(start.toISOString()).toBe("2026-08-17T00:00:00.000Z");
  });
});

describe("normaliseUnit", () => {
  it("folds synonyms together", () => {
    expect(normaliseUnit("Tablespoons")).toBe("tbsp");
    expect(normaliseUnit("grams")).toBe("g");
    expect(normaliseUnit("  LBS ")).toBe("lb");
  });

  it("treats blank and missing units as none", () => {
    expect(normaliseUnit(null)).toBeNull();
    expect(normaliseUnit("   ")).toBeNull();
  });

  it("leaves unknown units alone rather than guessing", () => {
    expect(normaliseUnit("pinch")).toBe("pinch");
  });
});

describe("aggregateIngredients", () => {
  it("merges the same ingredient across recipes", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 4, [{ name: "butter", quantity: 2, unit: "tbsp" }]),
      meal("B", 4, 4, [{ name: "butter", quantity: 3, unit: "tbsp" }], "b"),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(5);
    expect(lines[0].fromRecipes).toEqual(["A", "B"]);
  });

  it("merges across unit spellings", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 4, [{ name: "butter", quantity: 2, unit: "tbsp" }]),
      meal(
        "B",
        4,
        4,
        [{ name: "Butter", quantity: 1, unit: "Tablespoons" }],
        "b",
      ),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it("does not merge different units", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 4, [{ name: "milk", quantity: 1, unit: "cup" }]),
      meal("B", 4, 4, [{ name: "milk", quantity: 200, unit: "ml" }], "b"),
    ]);
    expect(lines).toHaveLength(2);
  });

  it("scales quantities to the servings planned", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 8, [{ name: "rice", quantity: 200, unit: "g" }]),
    ]);
    expect(lines[0].quantity).toBe(400);
  });

  it("scales down for a smaller serving count", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 2, [{ name: "rice", quantity: 200, unit: "g" }]),
    ]);
    expect(lines[0].quantity).toBe(100);
  });

  it("keeps unquantified lines separate from quantified ones", () => {
    // Merging these would print "2 tbsp butter" and silently lose the
    // "to taste" instruction.
    const lines = aggregateIngredients([
      meal("A", 4, 4, [{ name: "butter", quantity: 2, unit: "tbsp" }]),
      meal("B", 4, 4, [{ name: "butter", quantity: null, unit: null }], "b"),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines.filter((l) => l.quantity === null)).toHaveLength(1);
  });

  it("survives a recipe claiming zero servings", () => {
    const lines = aggregateIngredients([
      meal("A", 0, 4, [{ name: "rice", quantity: 100, unit: "g" }]),
    ]);
    expect(Number.isFinite(lines[0].quantity!)).toBe(true);
    expect(lines[0].quantity).toBe(400);
  });

  it("rounds away floating point noise", () => {
    const lines = aggregateIngredients([
      meal("A", 3, 1, [{ name: "flour", quantity: 100, unit: "g" }]),
    ]);
    // 100/3 = 33.333... must not leak 33.33333333333333
    expect(String(lines[0].quantity).length).toBeLessThanOrEqual(5);
  });

  it("ignores planned slots with no recipe", () => {
    expect(aggregateIngredients([{ servings: 4, recipe: null }])).toEqual([]);
  });

  it("drops a line whose contributors disagree from single attribution", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 4, [{ name: "butter", quantity: 2, unit: "tbsp" }]),
      meal("B", 4, 4, [{ name: "butter", quantity: 1, unit: "tbsp" }], "b"),
    ]);
    expect(lines[0].recipeId).toBeNull();
  });

  it("sorts alphabetically so the list reads consistently", () => {
    const lines = aggregateIngredients([
      meal("A", 4, 4, [
        { name: "zucchini", quantity: 1, unit: null },
        { name: "apples", quantity: 2, unit: null },
      ]),
    ]);
    expect(lines.map((l) => l.name)).toEqual(["apples", "zucchini"]);
  });
});

describe("buildShoppingListPayload", () => {
  const lines = aggregateIngredients([
    meal("Piccata", 4, 4, [
      { name: "chicken breast", quantity: 2, unit: "lb" },
      { name: "salt", quantity: null, unit: null },
    ]),
  ]);

  it("marks the payload as a shopping list", () => {
    const payload = buildShoppingListPayload(lines, "Week of X");
    expect(payload.link_type).toBe("shopping_list");
    expect(payload.title).toBe("Week of X");
  });

  it("uses line_item_measurements rather than the deprecated quantity/unit", () => {
    const payload = buildShoppingListPayload(lines, "t");
    const chicken = payload.line_items.find(
      (i) => i.name === "chicken breast",
    )!;
    expect(chicken.line_item_measurements).toEqual([
      { quantity: 2, unit: "lb" },
    ]);
    expect(chicken).not.toHaveProperty("quantity");
    expect(chicken).not.toHaveProperty("unit");
  });

  it("omits measurements for an unquantified item rather than inventing one", () => {
    const payload = buildShoppingListPayload(lines, "t");
    const salt = payload.line_items.find((i) => i.name === "salt")!;
    expect(salt.line_item_measurements).toBeUndefined();
  });

  it("credits the contributing recipes in the display text", () => {
    const payload = buildShoppingListPayload(lines, "t");
    expect(payload.line_items[0].display_text).toContain("Piccata");
  });

  it("skips blank names", () => {
    const payload = buildShoppingListPayload(
      [{ name: "  ", quantity: 1, unit: "g", fromRecipes: [], recipeId: null }],
      "t",
    );
    expect(payload.line_items).toEqual([]);
  });
});
