import { describe, expect, it } from "vitest";

import {
  COLLECTION_SLUGS,
  MAX_COLLECTIONS,
  pickCollections,
  type TagCount,
} from "@/lib/collections";
import { withArticle } from "@/lib/household";
import {
  heroEyebrow,
  RECENT_DAYS,
  recipeMetaParts,
  splitTitle,
} from "@/lib/recipe-meta";
import { formatOvenTempShort } from "@/lib/temperature";

const tag = (slug: string, count = 1, name = slug): TagCount => ({
  slug,
  name,
  count,
});

/** Every curated slug present, so nothing has to be topped up. */
const allCurated = COLLECTION_SLUGS.map((slug, i) => tag(slug, i + 1));

describe("pickCollections", () => {
  it("keeps the designed order rather than the count order", () => {
    // The curated list is an editorial decision about which ways in are worth
    // naming. Sorting it by popularity would quietly undo that.
    const picked = pickCollections(
      [...allCurated].reverse().map((t) => ({ ...t, count: 100 })),
    );

    expect(picked.map((t) => t.slug)).toEqual([...COLLECTION_SLUGS]);
  });

  it("skips a curated tag the library does not use", () => {
    const picked = pickCollections([tag("weeknight", 4), tag("grill", 2)]);

    expect(picked.map((t) => t.slug)).toEqual(["weeknight", "grill"]);
  });

  it("tops the row up from the busiest remaining tags", () => {
    // A library using none of the six curated words would otherwise show an
    // empty row - worse than the chip wall this replaces.
    const picked = pickCollections([
      tag("weeknight", 4),
      tag("beef", 9),
      tag("american", 12),
      tag("summer", 2),
    ]);

    expect(picked.map((t) => t.slug)).toEqual([
      "weeknight",
      "american",
      "beef",
      "summer",
    ]);
  });

  it("breaks a tie on name so the row does not reshuffle between requests", () => {
    const picked = pickCollections([tag("zucchini", 5), tag("apple", 5)], 2);

    expect(picked.map((t) => t.slug)).toEqual(["apple", "zucchini"]);
  });

  it("never repeats a curated tag in the top-up", () => {
    const picked = pickCollections([tag("weeknight", 99), tag("beef", 1)]);

    expect(picked.map((t) => t.slug)).toEqual(["weeknight", "beef"]);
  });

  it("stops at the limit even when every curated tag is present", () => {
    expect(pickCollections(allCurated)).toHaveLength(MAX_COLLECTIONS);
    expect(pickCollections(allCurated, 2).map((t) => t.slug)).toEqual([
      "weeknight",
      "sunday-cooking",
    ]);
  });

  it("drops tags no recipe carries", () => {
    // A named collection leading to an empty page is worse than one fewer.
    expect(pickCollections([tag("weeknight", 0), tag("grill", 3)])).toEqual([
      tag("grill", 3),
    ]);
  });

  it("answers empty for an empty library or a zero limit", () => {
    expect(pickCollections([])).toEqual([]);
    expect(pickCollections(allCurated, 0)).toEqual([]);
  });
});

describe("recipeMetaParts", () => {
  it("adds prep and cook into one total", () => {
    expect(
      recipeMetaParts({ prepMinutes: 20, cookMinutes: 60, servings: 4 }),
    ).toEqual(["1 hr 20 min", "Serves 4"]);
  });

  it("drops what it does not know instead of leaving a gap", () => {
    // The row is joined with slashes, so an empty part renders as "/ /".
    expect(recipeMetaParts({ servings: 2 })).toEqual(["Serves 2"]);
    expect(recipeMetaParts({})).toEqual([]);
  });

  it("treats a recipe with no time at all as having none", () => {
    expect(
      recipeMetaParts({ prepMinutes: 0, cookMinutes: 0, servings: 4 }),
    ).toEqual(["Serves 4"]);
  });

  it("takes one piece of equipment, not the packing list", () => {
    expect(
      recipeMetaParts({ servings: 4, equipment: ["Grill", "Tongs", "Probe"] }),
    ).toEqual(["Serves 4", "Grill"]);
  });

  it("ignores blank equipment entries", () => {
    expect(
      recipeMetaParts({ servings: 4, equipment: ["  ", "Cast iron"] }),
    ).toEqual(["Serves 4", "Cast iron"]);
  });

  it("keeps the parts in reading order", () => {
    expect(
      recipeMetaParts({
        prepMinutes: 10,
        cookMinutes: 20,
        servings: 6,
        equipment: ["Skillet"],
      }),
    ).toEqual(["30 min", "Serves 6", "Skillet"]);
  });
});

describe("formatOvenTempShort", () => {
  it("gives the dial setting without the conversion", () => {
    expect(formatOvenTempShort(475, "FAHRENHEIT")).toBe("475°F");
    expect(formatOvenTempShort(200, "CELSIUS")).toBe("200°C");
  });

  it("answers null when either half is missing", () => {
    // Mirrors the CHECK constraint: a number with no unit is not a temperature.
    expect(formatOvenTempShort(null, "FAHRENHEIT")).toBeNull();
    expect(formatOvenTempShort(475, null)).toBeNull();
  });
});

describe("splitTitle", () => {
  it("sets the qualifier apart from the dish", () => {
    expect(splitTitle("Zuni Chicken with Bread Salad")).toEqual({
      head: "Zuni Chicken",
      tail: "with Bread Salad",
    });
  });

  it("splits on the first join, not the last", () => {
    expect(splitTitle("Strip Steak with Horseradish with Mint").tail).toBe(
      "with Horseradish with Mint",
    );
  });

  it("leaves a title with no join whole", () => {
    expect(splitTitle("Weeknight Shoyu Ramen")).toEqual({
      head: "Weeknight Shoyu Ramen",
      tail: null,
    });
  });

  it("does not split a title that opens with the join", () => {
    // There is no first half to set the italic against.
    expect(splitTitle("With Love, Chicken")).toEqual({
      head: "With Love, Chicken",
      tail: null,
    });
  });

  it("needs whole words, not a substring", () => {
    // "Withered" and "Sandwiches" both contain "with".
    expect(splitTitle("Sandwiches and Slaw").tail).toBeNull();
  });
});

describe("heroEyebrow", () => {
  const now = Date.UTC(2026, 7, 29, 12, 0, 0);
  const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);

  it("announces an arrival that really did arrive this week", () => {
    expect(heroEyebrow(daysAgo(2), now)).toBe("Added this week");
  });

  it("stops claiming the calendar once the week is up", () => {
    // The hero always holds the newest recipe, so the line has to stay true
    // for a library nobody has added to in a month.
    expect(heroEyebrow(daysAgo(30), now)).toBe("Latest addition");
  });

  it("holds the boundary exactly at the cutoff", () => {
    expect(heroEyebrow(daysAgo(RECENT_DAYS), now)).toBe("Added this week");
    expect(heroEyebrow(daysAgo(RECENT_DAYS + 0.01), now)).toBe(
      "Latest addition",
    );
  });

  it("treats a clock behind the record as this week, not the future", () => {
    // Server and database clocks drift, and a recipe stamped a minute ahead
    // should not read as an old one.
    expect(heroEyebrow(daysAgo(-0.001), now)).toBe("Added this week");
  });
});

describe("withArticle", () => {
  it("gives a bare family name its article", () => {
    expect(withArticle("McMullens")).toBe("The McMullens");
  });

  it("does not double an article the name already has", () => {
    // The household names itself, and "The McMullens" is what a family calls
    // itself as often as "McMullens".
    expect(withArticle("The McMullens")).toBe("The McMullens");
    expect(withArticle("the Smiths")).toBe("the Smiths");
  });

  it("needs a whole word, not a prefix", () => {
    expect(withArticle("Theodores")).toBe("The Theodores");
  });

  it('leaves an empty name alone rather than answering "The"', () => {
    expect(withArticle("   ")).toBe("");
  });
});

describe("recipeMetaParts ordering", () => {
  it("leads on time for a grid card and on servings for the hero", () => {
    const recipe = { prepMinutes: 20, cookMinutes: 60, servings: 4 };

    expect(recipeMetaParts(recipe)).toEqual(["1 hr 20 min", "Serves 4"]);
    expect(recipeMetaParts(recipe, { servingsFirst: true })).toEqual([
      "Serves 4",
      "1 hr 20 min",
    ]);
  });

  it("keeps equipment last whichever way round the first two go", () => {
    expect(
      recipeMetaParts(
        { prepMinutes: 10, servings: 2, equipment: ["Grill"] },
        { servingsFirst: true },
      ),
    ).toEqual(["Serves 2", "10 min", "Grill"]);
  });

  it("still drops what it does not know when reordered", () => {
    expect(recipeMetaParts({ servings: 4 }, { servingsFirst: true })).toEqual([
      "Serves 4",
    ]);
  });
});
