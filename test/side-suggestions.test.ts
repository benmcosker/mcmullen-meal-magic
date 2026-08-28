import { describe, expect, it } from "vitest";

import { suggestSides, type MainDish } from "@/lib/side-suggestions";
import { SIDES } from "@/lib/sides";

const main = (over: Partial<MainDish> = {}): MainDish => ({
  title: "Chicken Piccata",
  ovenTemp: null,
  ovenTempUnit: null,
  equipment: [],
  ingredients: [{ name: "chicken breast" }],
  ...over,
});

describe("the catalogue", () => {
  it("has fifteen sides with distinct ids", () => {
    expect(SIDES).toHaveLength(15);
    expect(new Set(SIDES.map((s) => s.id)).size).toBe(15);
  });

  it("gives every side an oven unit whenever it gives a temperature", () => {
    // Mirrors the CHECK constraint on the recipe table: a number with no unit
    // is not a temperature, and these become real recipes when accepted.
    for (const side of SIDES) {
      expect(side.ovenTemp == null).toBe(side.ovenTempUnit == null);
    }
  });

  it("gives every side at least one ingredient and one step", () => {
    for (const side of SIDES) {
      expect(side.ingredients.length).toBeGreaterThan(0);
      expect(side.instructions.length).toBeGreaterThan(0);
    }
  });
});

describe("suggestSides", () => {
  it("puts a side that shares the oven temperature first", () => {
    // The signal that actually saves work: both trays, one oven, one dial.
    const suggestions = suggestSides(
      main({ ovenTemp: 425, ovenTempUnit: "FAHRENHEIT" }),
    );
    expect(suggestions[0].reasons.join(" ")).toContain("Roasts alongside");
    // Within the tolerance, not identical: 450F and 425F are the same oven
    // for practical purposes, and demanding an exact match would rule out
    // sides that share it perfectly well.
    expect(Math.abs(suggestions[0].side.ovenTemp! - 425)).toBeLessThanOrEqual(
      25,
    );
  });

  it("matches an oven across units rather than missing it", () => {
    // 220C is 428F, which is the same oven as a 425F side.
    const suggestions = suggestSides(
      main({ ovenTemp: 220, ovenTempUnit: "CELSIUS" }),
    );
    expect(suggestions[0].reasons.join(" ")).toContain("Roasts alongside");
  });

  it("does not offer a roast side for an oven set far hotter", () => {
    const suggestions = suggestSides(
      main({ ovenTemp: 250, ovenTempUnit: "FAHRENHEIT" }),
    );
    expect(
      suggestions.every((s) => !s.reasons.join(" ").includes("alongside")),
    ).toBe(true);
  });

  it("balances a starchy main with something green", () => {
    const suggestions = suggestSides(
      main({ ingredients: [{ name: "spaghetti" }, { name: "butter" }] }),
    );
    expect(["vegetable", "salad"]).toContain(suggestions[0].side.kind);
  });

  it("ranks every starch below every green when the main is starchy", () => {
    // Membership of the top three is not enough to pin this: the bonus for a
    // vegetable would carry them there even with no penalty on the starches.
    // The penalty is what puts a second starch at the bottom.
    const all = suggestSides(
      main({ ingredients: [{ name: "spaghetti" }] }),
      [],
      15,
    );
    const lastGreen = all.findLastIndex((s) =>
      ["vegetable", "salad"].includes(s.side.kind),
    );
    const firstStarch = all.findIndex((s) => s.side.kind === "starch");
    expect(firstStarch).toBeGreaterThan(lastGreen);
  });

  it("avoids a side that wants the pan the main is using", () => {
    const withSkillet = suggestSides(main({ equipment: ["Skillet"] }));
    const greens = withSkillet.find((s) => s.side.id === "sauteed-greens");
    // Either dropped out of the top three, or carried the warning.
    expect(
      greens === undefined || greens.reasons.join(" ").includes("Skillet"),
    ).toBe(true);
  });

  it("does not treat a shared sheet pan as a clash", () => {
    // Two trays in one oven is the pairing the oven matching exists to find.
    // Counting the tray as contested penalised exactly the sides it should
    // have been putting forward.
    const suggestions = suggestSides(
      main({
        ovenTemp: 425,
        ovenTempUnit: "FAHRENHEIT",
        equipment: ["Sheet pan"],
      }),
    );
    expect(
      suggestions
        .map((s) => s.reasons)
        .flat()
        .join(" "),
    ).not.toContain("sheet pan as well");
    expect(suggestions[0].reasons.join(" ")).toContain("Roasts alongside");
  });

  it("prefers sides the household already has the makings of", () => {
    // Compared against itself with an empty cupboard, rather than against the
    // other sides: a side can sit high for reasons that have nothing to do
    // with the pantry, and then this would pass without the pantry mattering.
    const pantry = ["Olive oil", "Red wine vinegar", "Dijon mustard"];
    const rank = (list: string[]) =>
      suggestSides(main(), list, 15).findIndex(
        (s) => s.side.id === "green-salad",
      );
    const withPantry = suggestSides(main(), pantry, 15).find(
      (s) => s.side.id === "green-salad",
    )!;
    const without = suggestSides(main(), [], 15).find(
      (s) => s.side.id === "green-salad",
    )!;

    expect(withPantry.score).toBeGreaterThan(without.score);
    expect(rank(pantry)).toBeLessThan(rank([]));
    expect(withPantry.reasons.join(" ")).toMatch(
      /You have \d of \d ingredients|everything for it/,
    );
  });

  it("says everything is in when the pantry covers a side outright", () => {
    const side = SIDES.find((s) => s.id === "green-salad")!;
    const pantry = side.ingredients.map((i) => i.name);
    const suggestions = suggestSides(main(), pantry, 15);
    expect(
      suggestions.find((s) => s.side.id === "green-salad")!.reasons,
    ).toContain("You have everything for it");
  });

  it("returns as many as asked for, and no more", () => {
    expect(suggestSides(main(), [], 3)).toHaveLength(3);
    expect(suggestSides(main(), [], 1)).toHaveLength(1);
    expect(suggestSides(main(), [], 99)).toHaveLength(SIDES.length);
  });

  it("gives every suggestion a reason a person can read", () => {
    // A suggestion nobody can account for is one nobody trusts.
    for (const s of suggestSides(
      main({ ovenTemp: 425, ovenTempUnit: "FAHRENHEIT" }),
      ["Olive oil"],
    )) {
      expect(s.reasons.length).toBeGreaterThan(0);
    }
  });

  it("orders sides that score the same alphabetically", () => {
    // Equal scores are common with fifteen sides and four signals. Without a
    // tie-break the order falls out of however the catalogue happens to be
    // written, which is not a reason a reader could ever infer.
    const all = suggestSides(main(), [], 15);
    const byScore = new Map<number, string[]>();
    for (const s of all) {
      byScore.set(s.score, [...(byScore.get(s.score) ?? []), s.side.title]);
    }
    for (const group of byScore.values()) {
      expect(group).toEqual([...group].sort((a, b) => a.localeCompare(b)));
    }
  });
});
