import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { clearRecipeImage, setRecipeImage } from "@/lib/recipe-image";
import { createRecipe } from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";

import { makeHousehold, resetDatabase as reset } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

/** The local driver writes here when no blob token is configured. */
const uploadsDir = join(process.cwd(), "public", "uploads");
const onDisk = (url: string) => join(uploadsDir, url.split("/").pop()!);

const photo = () =>
  new Uint8Array(readFileSync(join(process.cwd(), "test/fixtures/photo.jpg")));

describe.skipIf(!hasDb)("a recipe's photo", () => {
  let userId: string;
  let householdId: string;
  let recipeId: string;

  beforeEach(async () => {
    await reset();
    ({ householdId, userId } = await makeHousehold());
    recipeId = await createRecipe(
      recipeInput.parse({
        title: "Chicken Piccata",
        instructions: ["Cook"],
        ingredients: [],
        tags: [],
      }),
      householdId,
      userId,
    );
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  const imageUrl = async () =>
    (await prisma.recipe.findUnique({ where: { id: recipeId } }))?.imageUrl ??
    null;

  it("starts without one", async () => {
    expect(await imageUrl()).toBeNull();
  });

  it("stores the file and points the recipe at it", async () => {
    const url = await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );

    expect(await imageUrl()).toBe(url);
    expect(existsSync(onDisk(url))).toBe(true);
  });

  it("keeps one image per recipe, replacing rather than accumulating", async () => {
    const first = await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );
    const second = await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );

    expect(first).not.toBe(second);
    expect(await imageUrl()).toBe(second);
  });

  it("deletes the file it replaced, rather than orphaning it", async () => {
    // Every replacement would otherwise leave a paid-for file that nothing
    // references and nothing will ever find again.
    const first = await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );
    expect(existsSync(onDisk(first))).toBe(true);

    await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );
    expect(existsSync(onDisk(first))).toBe(false);
  });

  it("removes the photo and its file", async () => {
    const url = await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );
    await clearRecipeImage(recipeId, householdId);

    expect(await imageUrl()).toBeNull();
    expect(existsSync(onDisk(url))).toBe(false);
  });

  it("treats removing a photo that is not there as a no-op", async () => {
    await expect(
      clearRecipeImage(recipeId, householdId),
    ).resolves.toBeUndefined();
    expect(await imageUrl()).toBeNull();
  });

  it("refuses to attach a photo to a recipe that does not exist", async () => {
    // Better a clear failure than a stored file nothing will ever point at.
    await expect(
      setRecipeImage(
        "no-such-recipe",
        householdId,
        photo(),
        "photo.jpg",
        "image/jpeg",
      ),
    ).rejects.toThrow(/No such recipe/);
  });

  it("leaves other recipes' photos alone", async () => {
    const other = await createRecipe(
      recipeInput.parse({
        title: "Lentil Dahl",
        instructions: ["Cook"],
        ingredients: [],
        tags: [],
      }),
      householdId,
      userId,
    );
    const otherUrl = await setRecipeImage(
      other,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );
    await setRecipeImage(
      recipeId,
      householdId,
      photo(),
      "photo.jpg",
      "image/jpeg",
    );
    await clearRecipeImage(recipeId, householdId);

    const otherRecipe = await prisma.recipe.findUnique({
      where: { id: other },
    });
    expect(otherRecipe?.imageUrl).toBe(otherUrl);
    expect(existsSync(onDisk(otherUrl))).toBe(true);
  });
});
