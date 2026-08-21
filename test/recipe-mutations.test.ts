import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  createRecipe,
  deleteRecipe,
  listTagsWithCounts,
  updateRecipe,
} from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";
import { searchRecipes } from "@/lib/recipes";

const hasDb = Boolean(process.env.DATABASE_URL);

const base = {
  title: "Miso Butter Salmon",
  description: "Fast weeknight fish",
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 12,
  instructions: ["Whisk miso and butter", "Roast 12 minutes"],
  ingredients: [
    { name: "salmon fillet", quantity: 2, unit: null },
    { name: "white miso", quantity: 1, unit: "tbsp" },
  ],
  tags: ["Weeknight", "Seafood"],
};

describe.skipIf(!hasDb)("recipe mutations", () => {
  let userId: string;

  beforeEach(async () => {
    await reset();
    const user = await prisma.user.create({
      data: {
        // User.id has no database default: better-auth assigns it. Tests that
        // create users directly have to supply one.
        id: "test-cook",
        name: "Cook",
        email: "cook@example.com",
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

  it("creates a recipe that is immediately searchable", async () => {
    await createRecipe(recipeInput.parse(base), userId);
    const found = await searchRecipes({ query: "miso" });
    expect(found.map((r) => r.title)).toEqual(["Miso Butter Salmon"]);
  });

  it("stores ingredients in the order given", async () => {
    const id = await createRecipe(recipeInput.parse(base), userId);
    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { id },
      include: { ingredients: { orderBy: { position: "asc" } } },
    });
    expect(recipe.ingredients.map((i) => i.name)).toEqual([
      "salmon fillet",
      "white miso",
    ]);
  });

  it("reuses an existing tag rather than duplicating it", async () => {
    await createRecipe(recipeInput.parse(base), userId);
    await createRecipe(
      recipeInput.parse({
        ...base,
        title: "Another Weeknight Dish",
        tags: ["Weeknight"],
      }),
      userId,
    );

    const tags = await listTagsWithCounts();
    expect(tags.find((t) => t.name === "Weeknight")?.count).toBe(2);
    expect(await prisma.tag.count({ where: { slug: "weeknight" } })).toBe(1);
  });

  it("replaces ingredients and tags on edit rather than accumulating them", async () => {
    const id = await createRecipe(recipeInput.parse(base), userId);

    await updateRecipe(
      id,
      recipeInput.parse({
        ...base,
        title: "Miso Butter Cod",
        ingredients: [{ name: "cod fillet", quantity: 2, unit: null }],
        tags: ["Weeknight"],
      }),
    );

    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { id },
      include: { ingredients: true, tags: { include: { tag: true } } },
    });
    expect(recipe.ingredients.map((i) => i.name)).toEqual(["cod fillet"]);
    expect(recipe.tags.map((t) => t.tag.name)).toEqual(["Weeknight"]);
  });

  it("reindexes for search after an edit", async () => {
    const id = await createRecipe(recipeInput.parse(base), userId);
    await updateRecipe(
      id,
      recipeInput.parse({ ...base, title: "Miso Butter Cod" }),
    );

    expect((await searchRecipes({ query: "cod" })).map((r) => r.title)).toEqual(
      ["Miso Butter Cod"],
    );
    // The edit changed only the title, so the untouched "salmon fillet"
    // ingredient still matches - the index tracks the current row, not the
    // words the recipe was created with.
    expect(
      (await searchRecipes({ query: "salmon" })).map((r) => r.title),
    ).toEqual(["Miso Butter Cod"]);

    // Renaming away from a word does drop it, when nothing else supplies it.
    await updateRecipe(
      id,
      recipeInput.parse({
        ...base,
        title: "Miso Butter Cod",
        ingredients: [{ name: "cod fillet", quantity: 2, unit: null }],
      }),
    );
    expect(await searchRecipes({ query: "salmon" })).toEqual([]);
  });

  it("removes ingredients and tag links when the recipe is deleted", async () => {
    const id = await createRecipe(recipeInput.parse(base), userId);
    await deleteRecipe(id);

    expect(await prisma.ingredient.count({ where: { recipeId: id } })).toBe(0);
    expect(await prisma.recipeTag.count({ where: { recipeId: id } })).toBe(0);
    // The tags themselves survive - other recipes may still use them.
    expect(await prisma.tag.count()).toBeGreaterThan(0);
  });
});

describe("recipeInput validation", () => {
  it("rejects a blank title", () => {
    expect(recipeInput.safeParse({ ...base, title: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a non-positive quantity", () => {
    expect(
      recipeInput.safeParse({
        ...base,
        ingredients: [{ name: "salt", quantity: -1 }],
      }).success,
    ).toBe(false);
  });

  it("allows an ingredient with no quantity", () => {
    expect(
      recipeInput.safeParse({
        ...base,
        ingredients: [{ name: "salt to taste" }],
      }).success,
    ).toBe(true);
  });

  it("rejects a malformed source URL", () => {
    expect(
      recipeInput.safeParse({ ...base, sourceUrl: "not a url" }).success,
    ).toBe(false);
  });
});

async function reset() {
  await prisma.recipeTag.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.groceryItem.deleteMany();
  await prisma.plannedMeal.deleteMany();
  await prisma.shoppingHandoff.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
}
