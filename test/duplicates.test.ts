import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  findRecipeByPdfHash,
  findSimilarlyTitled,
  hashBytes,
} from "@/lib/duplicates";
import { createRecipe } from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";

import { makeHousehold, resetDatabase as reset } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

const bytes = (text: string) => new TextEncoder().encode(text);

describe("hashBytes", () => {
  it("gives the same hash for identical bytes", () => {
    expect(hashBytes(bytes("same"))).toBe(hashBytes(bytes("same")));
  });

  it("gives a different hash for a one-byte change", () => {
    expect(hashBytes(bytes("recipe"))).not.toBe(hashBytes(bytes("recipf")));
  });

  it("is a hex sha-256", () => {
    expect(hashBytes(bytes("x"))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe.skipIf(!hasDb)("duplicate detection", () => {
  let userId: string;
  let householdId: string;

  beforeEach(async () => {
    await reset();
    ({ householdId, userId } = await makeHousehold());
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  const add = (title: string, pdfSha256?: string) =>
    createRecipe(
      recipeInput.parse({
        title,
        instructions: ["Cook"],
        ingredients: [],
        tags: [],
      }),
      householdId,
      userId,
      pdfSha256 ? { source: "PDF", pdfSha256 } : {},
    );

  describe("by file hash", () => {
    it("finds a recipe created from the same PDF", async () => {
      const hash = hashBytes(bytes("the pdf"));
      await add("Chicken Piccata", hash);

      const found = await findRecipeByPdfHash(hash, householdId);
      expect(found?.title).toBe("Chicken Piccata");
    });

    it("does not match a different file", async () => {
      await add("Chicken Piccata", hashBytes(bytes("the pdf")));
      expect(
        await findRecipeByPdfHash(hashBytes(bytes("other pdf")), householdId),
      ).toBeNull();
    });

    it("lets any number of hand-typed recipes coexist", async () => {
      // Manual recipes have a null hash. Postgres treats NULLs as distinct, so
      // the unique index must not collapse them into one.
      await add("Typed One");
      await add("Typed Two");
      await add("Typed Three");
      expect(await prisma.recipe.count()).toBe(3);
    });

    it("refuses to store the same PDF against two recipes", async () => {
      const hash = hashBytes(bytes("the pdf"));
      await add("First", hash);
      // The unique index is what settles a race between two simultaneous
      // uploads that both passed the pre-flight check.
      await expect(add("Second", hash)).rejects.toThrow();
    });
  });

  describe("by title", () => {
    it("flags an all-but-identical title", async () => {
      await add("Chicken Piccata");
      const similar = await findSimilarlyTitled(
        "Chicken Piccata!",
        householdId,
      );
      expect(similar.map((s) => s.title)).toContain("Chicken Piccata");
    });

    it("flags a title differing only in case and spacing", async () => {
      await add("Sheet Pan Salmon");
      const similar = await findSimilarlyTitled(
        "  sheet pan salmon ",
        householdId,
      );
      expect(similar.map((s) => s.title)).toContain("Sheet Pan Salmon");
    });

    it("does not flag a different dish that shares a word", async () => {
      // The failure that would matter: warning on every chicken recipe trains
      // people to dismiss the warning without reading it.
      await add("Chicken Piccata");
      expect(await findSimilarlyTitled("Chicken Soup", householdId)).toEqual(
        [],
      );
      expect(await findSimilarlyTitled("Roast Chicken", householdId)).toEqual(
        [],
      );
    });

    it("does not flag an unrelated title", async () => {
      await add("Chicken Piccata");
      expect(await findSimilarlyTitled("Lentil Dahl", householdId)).toEqual([]);
    });

    it("can exclude a recipe from its own results", async () => {
      const id = await add("Chicken Piccata");
      expect(
        await findSimilarlyTitled("Chicken Piccata", householdId, {
          excludeId: id,
        }),
      ).toEqual([]);
    });

    it("returns nothing for a blank title rather than everything", async () => {
      await add("Chicken Piccata");
      expect(await findSimilarlyTitled("   ", householdId)).toEqual([]);
    });
  });
});
