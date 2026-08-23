import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  aggregateIngredients,
  buildExclusions,
  type PlannedMealWithRecipe,
} from "@/lib/grocery";
import { addPantryItem, listPantryItems, removePantryItem } from "@/lib/pantry";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("buildExclusions", () => {
  const pantry = (...names: string[]) =>
    buildExclusions(
      names.map((normalisedName) => ({ normalisedName })),
      [],
    );

  it("keeps off both the pantry and this week's picked-up items", () => {
    const excluded = buildExclusions(
      [{ normalisedName: "olive oil" }],
      [{ normalisedName: "milk" }],
    );
    expect(excluded.has("olive oil")).toBe(true);
    expect(excluded.has("milk")).toBe(true);
    expect(excluded.has("chicken")).toBe(false);
  });

  it("excludes nothing when both lists are empty", () => {
    expect(buildExclusions([], []).has("chicken")).toBe(false);
  });

  describe("a weekly skip matches exactly", () => {
    it("matches the line as it was printed", () => {
      const excluded = buildExclusions([], [{ normalisedName: "milk" }]);
      expect(excluded.has("milk")).toBe(true);
    });

    it("does not spread to related lines", () => {
      // You ticked off one line, not a category. Ticking "milk" should not
      // silently remove the coconut milk a curry needs.
      const excluded = buildExclusions([], [{ normalisedName: "milk" }]);
      expect(excluded.has("coconut milk")).toBe(false);
      expect(excluded.has("whole milk")).toBe(false);
    });
  });

  describe("a pantry staple matches by phrase", () => {
    it("covers a recipe that names the staple more precisely", () => {
      // "Olive oil" in the cupboard has to cover a card asking for extra
      // virgin, or the pantry never actually removes anything.
      expect(pantry("olive oil").has("extra virgin olive oil")).toBe(true);
    });

    it("covers a recipe that names it less precisely", () => {
      // The reverse, which is the common case with this staple list: the
      // cupboard says "coarse salt" and every recipe just says "salt".
      expect(pantry("coarse salt").has("salt")).toBe(true);
      expect(pantry("all-purpose flour").has("flour")).toBe(true);
      expect(pantry("granulated sugar").has("sugar")).toBe(true);
    });

    it("matches whole words, not fragments", () => {
      // The failure that would matter: a pantry of salt quietly removing the
      // salted butter a recipe actually needs bought.
      expect(pantry("salt").has("salted butter")).toBe(false);
    });

    it("matches what a name is about, not a word it happens to contain", () => {
      // Egg noodles contain the word "egg" and are not eggs. A looser rule
      // dropped them from the list, which is how you get home without dinner.
      expect(pantry("eggs").has("egg noodles")).toBe(false);
      expect(pantry("eggs").has("eggplant")).toBe(false);
      expect(pantry("neutral oil").has("oil-packed anchovies")).toBe(false);
    });

    it("leaves genuinely different things on the list", () => {
      expect(pantry("granulated sugar").has("brown sugar")).toBe(false);
      expect(pantry("all-purpose flour").has("almond flour")).toBe(false);
      expect(pantry("neutral oil").has("sesame oil")).toBe(false);
      expect(pantry("olive oil").has("truffle oil")).toBe(false);
    });

    it("does not care about singular or plural", () => {
      expect(pantry("eggs").has("egg")).toBe(true);
      expect(pantry("egg").has("eggs")).toBe(true);
    });

    it("copes with punctuation in either name", () => {
      expect(pantry("all-purpose flour").has("all purpose flour")).toBe(true);
    });

    it("ignores an empty pantry entry rather than excluding everything", () => {
      // A blank staple whose words list is empty would otherwise be contained
      // in every ingredient name, emptying the shopping list.
      expect(pantry("", "   ").has("chicken")).toBe(false);
    });
  });
});

describe("a pantry staple never reaches the list", () => {
  const meal = (names: string[]): PlannedMealWithRecipe =>
    ({
      servings: 4,
      recipe: {
        servings: 4,
        ingredients: names.map((name, position) => ({
          name,
          quantity: 1,
          unit: "tbsp",
          note: null,
          position,
        })),
      },
    }) as unknown as PlannedMealWithRecipe;

  it("drops it however many recipes call for it", () => {
    // The point of the pantry: three recipes wanting olive oil should not put
    // olive oil on the list even once.
    const lines = aggregateIngredients(
      [
        meal(["Olive oil", "Chicken"]),
        meal(["olive oil", "Rice"]),
        meal(["OLIVE OIL"]),
      ],
      buildExclusions([{ normalisedName: "olive oil" }], []),
    );

    expect(lines.map((l) => l.name)).toEqual(["Chicken", "Rice"]);
  });

  it("leaves everything else alone", () => {
    const lines = aggregateIngredients(
      [meal(["Salt", "Chicken"])],
      buildExclusions([{ normalisedName: "salt" }], []),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe("Chicken");
  });
});

describe.skipIf(!hasDb)("the pantry list", () => {
  let userId: string;

  beforeEach(async () => {
    await reset();
    const user = await prisma.user.create({
      data: {
        id: "pantry-user",
        name: "Cook",
        email: "pantry@example.com",
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("keeps what you add, sorted by name", async () => {
    await addPantryItem("Olive oil", userId);
    await addPantryItem("Flour", userId);
    await addPantryItem("Salt", userId);

    expect((await listPantryItems()).map((i) => i.name)).toEqual([
      "Flour",
      "Olive oil",
      "Salt",
    ]);
  });

  it("stores the name as typed and matches on a normalised form", async () => {
    const result = await addPantryItem("  Olive Oil  ", userId);
    expect(result.ok && result.item.name).toBe("Olive Oil");
    expect(result.ok && result.item.normalisedName).toBe("olive oil");
  });

  it("treats adding the same staple twice as a no-op, not a failure", async () => {
    // Two people tidying the pantry on a Sunday should not see an error for
    // agreeing with each other.
    const first = await addPantryItem("Olive oil", userId);
    const second = await addPantryItem("olive oil", userId);

    expect(second.ok).toBe(true);
    expect(first.ok && second.ok && second.item.id).toBe(
      first.ok ? first.item.id : null,
    );
    expect(await prisma.pantryItem.count()).toBe(1);
  });

  it("refuses a blank name", async () => {
    const result = await addPantryItem("   ", userId);
    expect(result.ok).toBe(false);
  });

  it("refuses a name too long to be an ingredient", async () => {
    expect((await addPantryItem("x".repeat(121), userId)).ok).toBe(false);
  });

  it("puts an item back on the shopping list when removed", async () => {
    const added = await addPantryItem("Olive oil", userId);
    if (!added.ok) throw new Error("setup failed");

    await removePantryItem(added.item.id);
    expect(await listPantryItems()).toEqual([]);
  });

  it("is shared, not per person", async () => {
    // One kitchen, one salt cellar. What one person adds, everyone sees.
    const other = await prisma.user.create({
      data: {
        id: "pantry-other",
        name: "Other",
        email: "other@example.com",
        emailVerified: true,
        updatedAt: new Date(),
      },
    });

    await addPantryItem("Olive oil", userId);
    await addPantryItem("Flour", other.id);

    expect((await listPantryItems()).map((i) => i.name)).toEqual([
      "Flour",
      "Olive oil",
    ]);
  });

  it("is refused at the database level as a duplicate", async () => {
    await addPantryItem("Olive oil", userId);
    await expect(
      prisma.pantryItem.create({
        data: {
          name: "Olive Oil",
          normalisedName: "olive oil",
          createdById: userId,
        },
      }),
    ).rejects.toThrow();
  });

  it("goes with a departing user", async () => {
    await addPantryItem("Olive oil", userId);
    await prisma.user.delete({ where: { id: userId } });
    expect(await listPantryItems()).toEqual([]);
  });
});

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
