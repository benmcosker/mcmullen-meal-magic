import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { DEFAULT_SORT, parseSort } from "@/lib/recipe-sort";
import { createRecipe } from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";
import { searchRecipes } from "@/lib/recipes";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("parseSort", () => {
  it.each(["newest", "oldest", "title"])("accepts %s", (value) => {
    expect(parseSort(value)).toBe(value);
  });

  it.each([undefined, null, "", "rating", "DROP TABLE recipe", 7, {}])(
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

  beforeEach(async () => {
    await reset();
    const user = await prisma.user.create({
      data: {
        id: "sort-user",
        name: "Cook",
        email: "sort@example.com",
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
    userId = user.id;

    // Added in a deliberate order, with titles that do not match it.
    for (const title of ["Zabaglione", "apple crumble", "Mushroom Risotto"]) {
      await add(title, userId);
    }
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  const titles = async (options = {}) =>
    (await searchRecipes(options)).map((r) => r.title);

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

  describe("alongside a search", () => {
    beforeEach(async () => {
      await add("Lemon Chicken", userId);
      await add("Chicken Soup", userId);
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
        userId,
      );
      expect(tagged).toBeTruthy();

      for (const sort of ["newest", "oldest", "title"] as const) {
        expect(await titles({ tagSlugs: ["weeknight"], sort })).toEqual([
          "Tagged Dish",
        ]);
      }
    });
  });
});

async function add(title: string, userId: string) {
  const id = await createRecipe(
    recipeInput.parse({
      title,
      instructions: ["Cook"],
      ingredients: [],
      tags: [],
    }),
    userId,
  );
  // createdAt defaults to now(); without a gap the ordering of same-millisecond
  // rows is undefined and the test would be flaky rather than wrong.
  await new Promise((resolve) => setTimeout(resolve, 15));
  return id;
}

async function reset() {
  await prisma.pantryItem.deleteMany();
  await prisma.weeklySkip.deleteMany();
  await prisma.recipeReview.deleteMany();
  await prisma.recipeTag.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.plannedMeal.deleteMany();
  await prisma.shoppingHandoff.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
}
