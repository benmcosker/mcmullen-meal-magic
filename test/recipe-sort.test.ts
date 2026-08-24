import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { DEFAULT_SORT, parseSort } from "@/lib/recipe-sort";
import { createRecipe } from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";
import { searchRecipes, type RecipeSearchOptions } from "@/lib/recipes";
import { saveReview } from "@/lib/reviews";

import { makeHousehold, resetDatabase as reset } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("parseSort", () => {
  it.each(["newest", "rating", "oldest", "title"])("accepts %s", (value) => {
    expect(parseSort(value)).toBe(value);
  });

  it.each([undefined, null, "", "stars", "DROP TABLE recipe", 7, {}])(
    "falls back to the default for %j",
    (value) => {
      // The value arrives from a URL, where a stale link or a typo is ordinary
      // - and where anything at all can be typed.
      expect(parseSort(value)).toBe(DEFAULT_SORT);
    },
  );
});

describe.skipIf(!hasDb)("ordering the library", () => {
  let userId: string;
  let householdId: string;
  let ids: Record<string, string>;

  beforeEach(async () => {
    await reset();
    ({ householdId, userId } = await makeHousehold());

    // Added in a deliberate order, with titles that do not match it.
    ids = {};
    for (const title of ["Zabaglione", "apple crumble", "Mushroom Risotto"]) {
      ids[title] = await add(title, householdId, userId);
    }
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  const titles = async (options: Partial<RecipeSearchOptions> = {}) =>
    (await searchRecipes({ ...options })).map((r) => r.title);

  /** One review per star given, each from a different person. */
  async function rate(title: string, stars: number[]) {
    for (const [index, value] of stars.entries()) {
      const id = await reviewer(`${title}-${index}`);
      await saveReview(ids[title], id, {
        stars: value,
        body: null,
      });
    }
  }

  async function reviewer(key: string) {
    const id = `reviewer-${key}`.replace(/\s+/g, "-").toLowerCase();
    await prisma.user.create({
      data: {
        id,
        name: "Reviewer",
        email: `${id}@example.com`,
        emailVerified: true,
        updatedAt: new Date(),
        householdId,
      },
    });
    return id;
  }

  it("puts the most recent first by default", async () => {
    expect(await titles()).toEqual([
      "Mushroom Risotto",
      "apple crumble",
      "Zabaglione",
    ]);
  });

  it("puts the most recent first when asked explicitly", async () => {
    expect(await titles({ sort: "newest" })).toEqual([
      "Mushroom Risotto",
      "apple crumble",
      "Zabaglione",
    ]);
  });

  it("reverses for oldest", async () => {
    expect(await titles({ sort: "oldest" })).toEqual([
      "Zabaglione",
      "apple crumble",
      "Mushroom Risotto",
    ]);
  });

  it("sorts by title without regard to case", async () => {
    // A case-sensitive sort puts every lower-case title after every upper-case
    // one, so "apple crumble" would land after "Zabaglione".
    expect(await titles({ sort: "title" })).toEqual([
      "apple crumble",
      "Mushroom Risotto",
      "Zabaglione",
    ]);
  });

  describe("by rating", () => {
    it("puts the best-liked first", async () => {
      await rate("Zabaglione", [5, 5]);
      await rate("apple crumble", [2]);
      await rate("Mushroom Risotto", [4, 4]);

      expect(await titles({ sort: "rating" })).toEqual([
        "Zabaglione",
        "Mushroom Risotto",
        "apple crumble",
      ]);
    });

    it("leaves the unrated at the bottom rather than the top", async () => {
      // The trap this guards: NULL counts as greater than any number in a
      // descending sort, so without NULLS LAST the recipes nobody has an
      // opinion on lead the list of the best-liked ones.
      await rate("apple crumble", [1]);

      expect(await titles({ sort: "rating" })).toEqual([
        "apple crumble",
        "Mushroom Risotto",
        "Zabaglione",
      ]);
    });

    it("falls back to newest among the unrated", async () => {
      expect(await titles({ sort: "rating" })).toEqual([
        "Mushroom Risotto",
        "apple crumble",
        "Zabaglione",
      ]);
    });

    it("breaks a tie on how many people rated it", async () => {
      // Zabaglione is the older of the two, so a tie broken by date rather
      // than by weight of opinion would put it second.
      await rate("Zabaglione", [4, 4, 4]);
      await rate("apple crumble", [4]);

      // Both average four stars; the one three people agree on leads.
      expect(await titles({ sort: "rating" })).toEqual([
        "Zabaglione",
        "apple crumble",
        "Mushroom Risotto",
      ]);
    });

    it("treats averages that display the same as a tie", async () => {
      // 4.33 and 4.25 both show as "4.3" on the card. Ordering them by the
      // hidden digit would leave a list the reader cannot make sense of, so
      // the count decides instead - and the lower raw average wins here.
      await rate("Zabaglione", [5, 4, 4, 4]);
      await rate("apple crumble", [5, 4, 4]);

      expect(await titles({ sort: "rating" })).toEqual([
        "Zabaglione",
        "apple crumble",
        "Mushroom Risotto",
      ]);
    });

    it("counts a changed review once", async () => {
      // saveReview upserts, so cooking it again and thinking better of it
      // moves the average rather than adding a second vote.
      const cook = await reviewer("second-thoughts");
      await saveReview(ids["Zabaglione"], cook, {
        stars: 1,
        body: null,
      });
      await saveReview(ids["Zabaglione"], cook, {
        stars: 5,
        body: null,
      });
      await rate("apple crumble", [3]);

      expect(await titles({ sort: "rating" })).toEqual([
        "Zabaglione",
        "apple crumble",
        "Mushroom Risotto",
      ]);
    });

    it("outranks relevance when a search is running", async () => {
      ids["Lemon Chicken"] = await add("Lemon Chicken", householdId, userId);
      ids["Chicken Soup"] = await add("Chicken Soup", householdId, userId);
      await rate("Chicken Soup", [5]);
      await rate("Lemon Chicken", [2]);

      expect(await titles({ query: "chicken", sort: "rating" })).toEqual([
        "Chicken Soup",
        "Lemon Chicken",
      ]);
    });
  });

  describe("alongside a search", () => {
    beforeEach(async () => {
      await add("Lemon Chicken", householdId, userId);
      await add("Chicken Soup", householdId, userId);
    });

    it("still finds only what matches", async () => {
      expect(await titles({ query: "chicken" })).toHaveLength(2);
    });

    it("lets an explicit order win over relevance", async () => {
      expect(await titles({ query: "chicken", sort: "title" })).toEqual([
        "Chicken Soup",
        "Lemon Chicken",
      ]);
      expect(await titles({ query: "chicken", sort: "oldest" })).toEqual([
        "Lemon Chicken",
        "Chicken Soup",
      ]);
    });

    it("keeps tag filters working whatever the order", async () => {
      const tagged = await createRecipe(
        recipeInput.parse({
          title: "Tagged Dish",
          instructions: ["Cook"],
          ingredients: [],
          tags: ["Weeknight"],
        }),
        householdId,
        userId,
      );
      expect(tagged).toBeTruthy();

      for (const sort of ["newest", "rating", "oldest", "title"] as const) {
        expect(await titles({ tagSlugs: ["weeknight"], sort })).toEqual([
          "Tagged Dish",
        ]);
      }
    });
  });
});

async function add(
  title: string,
  householdId: string,
  userId: string,
): Promise<string> {
  const id = await createRecipe(
    recipeInput.parse({
      title,
      instructions: ["Cook"],
      ingredients: [],
      tags: [],
    }),
    householdId,
    userId,
  );
  // createdAt defaults to now(); without a gap the ordering of same-millisecond
  // rows is undefined and the test would be flaky rather than wrong.
  await new Promise((resolve) => setTimeout(resolve, 15));
  return id;
}
