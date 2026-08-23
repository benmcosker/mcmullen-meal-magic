import { describe, expect, it } from "vitest";

import { recipeInput } from "@/lib/recipe-schema";
import { formatMinutes, formatOvenTemp } from "@/lib/temperature";

const base = {
  title: "Chicken Piccata",
  instructions: ["Cook"],
  ingredients: [],
  tags: [],
};

describe("oven temperature", () => {
  it("keeps the unit the card printed", () => {
    const recipe = recipeInput.parse({
      ...base,
      ovenTemp: 180,
      ovenTempUnit: "CELSIUS",
    });
    expect(recipe.ovenTemp).toBe(180);
    expect(recipe.ovenTempUnit).toBe("CELSIUS");
  });

  it("refuses a temperature with no unit", () => {
    // 180 is a slow oven in Fahrenheit and a hot one in Celsius. Guessing
    // wrong ruins dinner, so the pair has to be complete.
    const result = recipeInput.safeParse({ ...base, ovenTemp: 180 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/Fahrenheit or Celsius/);
  });

  it("allows a unit with no temperature, which the form clears anyway", () => {
    expect(
      recipeInput.safeParse({ ...base, ovenTempUnit: "CELSIUS" }).success,
    ).toBe(true);
  });

  it("catches a Celsius number labelled Fahrenheit", () => {
    // The mistake that matters: 180F is a warming drawer, not a bake.
    const result = recipeInput.safeParse({
      ...base,
      ovenTemp: 900,
      ovenTempUnit: "FAHRENHEIT",
    });
    expect(result.success).toBe(false);
  });

  it("catches a Fahrenheit number labelled Celsius", () => {
    const result = recipeInput.safeParse({
      ...base,
      ovenTemp: 425,
      ovenTempUnit: "CELSIUS",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/Celsius/);
  });

  it.each([
    [100, "FAHRENHEIT"],
    [600, "FAHRENHEIT"],
    [40, "CELSIUS"],
    [315, "CELSIUS"],
  ] as const)("accepts %i %s, at the edge of the range", (temp, unit) => {
    // Dehydrating and low-and-slow live down here; rejecting them would lose
    // real recipes to a range meant only to catch unit confusion.
    expect(
      recipeInput.safeParse({ ...base, ovenTemp: temp, ovenTempUnit: unit })
        .success,
    ).toBe(true);
  });
});

describe("formatOvenTemp", () => {
  it("leads with the printed number and follows with the conversion", () => {
    expect(formatOvenTemp(375, "FAHRENHEIT")).toBe("375°F (190°C)");
  });

  it("works the other way round", () => {
    expect(formatOvenTemp(180, "CELSIUS")).toBe("180°C (355°F)");
  });

  it("rounds the conversion to something an oven dial can do", () => {
    // 350F is 176.67C exactly. Nobody has that dial.
    expect(formatOvenTemp(350, "FAHRENHEIT")).toBe("350°F (175°C)");
  });

  it("is null when there is no temperature", () => {
    expect(formatOvenTemp(null, "FAHRENHEIT")).toBeNull();
    expect(formatOvenTemp(375, null)).toBeNull();
  });
});

describe("formatMinutes", () => {
  it.each([
    [5, "5 min"],
    [59, "59 min"],
    [60, "1 hr"],
    [85, "1 hr 25 min"],
    [120, "2 hr"],
    [1440, "24 hr"],
  ])("formats %i as %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });

  it("is null for nothing, so callers can skip the row", () => {
    expect(formatMinutes(null)).toBeNull();
    expect(formatMinutes(0)).toBeNull();
  });
});

describe("the rest of the card", () => {
  it("keeps a yield the serving count cannot express", () => {
    const recipe = recipeInput.parse({
      ...base,
      yieldNote: "Makes 12 muffins",
    });
    expect(recipe.yieldNote).toBe("Makes 12 muffins");
  });

  it("keeps resting time apart from cooking time", () => {
    // They plan differently: resting changes when you start, cooking changes
    // how long you stand at the stove.
    const recipe = recipeInput.parse({
      ...base,
      cookMinutes: 25,
      restMinutes: 480,
    });
    expect(recipe.cookMinutes).toBe(25);
    expect(recipe.restMinutes).toBe(480);
  });

  it("keeps the equipment list", () => {
    const recipe = recipeInput.parse({
      ...base,
      equipment: ["9x13 baking dish", "Dutch oven"],
    });
    expect(recipe.equipment).toEqual(["9x13 baking dish", "Dutch oven"]);
  });

  it("defaults equipment to empty rather than undefined", () => {
    expect(recipeInput.parse(base).equipment).toEqual([]);
  });

  it("credits a source that has no URL", () => {
    const recipe = recipeInput.parse({ ...base, sourceName: "Bon Appetit" });
    expect(recipe.sourceName).toBe("Bon Appetit");
    expect(recipe.sourceUrl).toBeUndefined();
  });
});
