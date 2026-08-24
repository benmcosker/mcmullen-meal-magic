import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { findRecipeByPdfHash, findSimilarlyTitled } from "@/lib/duplicates";
import { getWeeklySkips, getWeekPlan, weekStartOf } from "@/lib/grocery";
import { defaultHouseholdName, getHousehold } from "@/lib/household";
import { createInvite, redeemInvite } from "@/lib/invites";
import { addPantryItem, listPantryItems, removePantryItem } from "@/lib/pantry";
import {
  createRecipe,
  deleteRecipe,
  listTagsWithCounts,
  updateRecipe,
} from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";
import { getRecipe, searchRecipeIds, searchRecipes } from "@/lib/recipes";
import { getReviewSummary, saveReview } from "@/lib/reviews";

import { makeHousehold, makeUser, resetDatabase as reset } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("defaultHouseholdName", () => {
  it("names it after whoever it was made for", () => {
    expect(defaultHouseholdName("Ben")).toBe("Ben's Household");
  });

  it("does not double the s on a name that ends in one", () => {
    expect(defaultHouseholdName("Chris")).toBe("Chris' Household");
  });

  it("falls back when there is no name to use", () => {
    expect(defaultHouseholdName("   ")).toBe("My Household");
  });
});

describe.skipIf(!hasDb)("two households", () => {
  let ours: { householdId: string; userId: string };
  let theirs: { householdId: string; userId: string };

  beforeEach(async () => {
    await reset();
    ours = await makeHousehold("Ours");
    theirs = await makeHousehold("Theirs");
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  const add = (
    household: { householdId: string; userId: string },
    title: string,
    extra: Parameters<typeof createRecipe>[3] = {},
  ) =>
    createRecipe(
      recipeInput.parse({
        title,
        instructions: ["Cook"],
        ingredients: [{ name: "butter", quantity: 1, unit: "tbsp" }],
        tags: ["Weeknight"],
      }),
      household.householdId,
      household.userId,
      extra,
    );

  describe("the library", () => {
    it("shows each household only its own recipes", async () => {
      await add(ours, "Our Piccata");
      await add(theirs, "Their Dahl");

      expect(
        (await searchRecipes({ householdId: ours.householdId })).map(
          (r) => r.title,
        ),
      ).toEqual(["Our Piccata"]);
      expect(
        (await searchRecipes({ householdId: theirs.householdId })).map(
          (r) => r.title,
        ),
      ).toEqual(["Their Dahl"]);
    });

    it("filters in the query, not only when hydrating the rows", async () => {
      // searchRecipes re-checks the household when it loads the rows, so it
      // stays correct even if the SQL forgets to. searchRecipeIds is where the
      // ranking and the LIMIT are applied, though, and a filter missing there
      // would quietly cost a household rows off the end of its own list. So
      // this goes at the ranking layer directly rather than through the
      // hydrated call.
      await add(theirs, "Their Dahl");
      await add(ours, "Our Piccata");

      const ids = await searchRecipeIds({ householdId: ours.householdId });
      expect(ids).toHaveLength(1);

      const [mine] = await searchRecipes({ householdId: ours.householdId });
      expect(ids[0].id).toBe(mine.id);
    });

    it("filters in the text-search query too", async () => {
      // The two branches are separate SQL statements, and only this one runs
      // when there is something in the search box.
      await add(theirs, "Chicken Piccata");
      await add(ours, "Chicken Piccata");

      const ids = await searchRecipeIds({
        householdId: ours.householdId,
        query: "chicken",
      });
      expect(ids).toHaveLength(1);
    });

    it("does not spend a page of results on another household", async () => {
      // What a missing filter in the SQL actually costs: the LIMIT is applied
      // before the rows are checked, so a household asking for two recipes
      // gets back however many of the first two happened to be its own.
      await add(theirs, "Their One");
      await add(theirs, "Their Two");
      await add(ours, "Our One");
      await add(ours, "Our Two");

      const page = await searchRecipes({
        householdId: ours.householdId,
        limit: 2,
      });
      expect(page.map((r) => r.title).sort()).toEqual(["Our One", "Our Two"]);
    });

    it("does not turn up another household's recipe in a search", async () => {
      await add(theirs, "Their Dahl");

      // Matches on title, ingredient and tag alike - every branch of the query
      // has to carry the household, not just the one the first test happened
      // to exercise.
      for (const query of ["dahl", "butter", "weeknight"]) {
        expect(
          await searchRecipes({ householdId: ours.householdId, query }),
        ).toEqual([]);
      }
    });

    it("answers 'not found' for another household's recipe by id", async () => {
      const id = await add(theirs, "Their Dahl");

      // Not "forbidden": that would confirm the recipe exists. A household
      // should not be able to learn anything about another's library, the
      // size of it included.
      expect(await getRecipe(id, ours.householdId)).toBeNull();
      expect(await getRecipe(id, theirs.householdId)).not.toBeNull();
    });

    it("refuses to edit or delete another household's recipe", async () => {
      const id = await add(theirs, "Their Dahl");

      const edited = await updateRecipe(
        id,
        ours.householdId,
        recipeInput.parse({
          title: "Hijacked",
          instructions: ["Cook"],
          ingredients: [],
          tags: [],
        }),
      );
      expect(edited).toBe(false);
      expect(await deleteRecipe(id, ours.householdId)).toBe(false);

      const survivor = await getRecipe(id, theirs.householdId);
      expect(survivor?.title).toBe("Their Dahl");
    });

    it("counts tags only within the household", async () => {
      await add(ours, "Our Piccata");
      await add(theirs, "Their Dahl");
      await add(theirs, "Their Soup");

      const ourTags = await listTagsWithCounts(ours.householdId);
      expect(ourTags.map((t) => [t.name, t.count])).toEqual([["Weeknight", 1]]);

      const theirTags = await listTagsWithCounts(theirs.householdId);
      expect(theirTags.map((t) => [t.name, t.count])).toEqual([
        ["Weeknight", 2],
      ]);
    });

    it("drops a tag from the bar when only another household uses it", async () => {
      await add(theirs, "Their Dahl");
      expect(await listTagsWithCounts(ours.householdId)).toEqual([]);
    });
  });

  describe("duplicate detection", () => {
    it("lets both households own a copy of the same recipe card", async () => {
      const pdfSha256 = "a".repeat(64);
      await add(ours, "Piccata", { source: "PDF", pdfSha256 });

      // The unique index is now (household, hash). If it were still on the
      // hash alone this would throw, and the second family could never upload
      // a card the first already had.
      await expect(
        add(theirs, "Piccata", { source: "PDF", pdfSha256 }),
      ).resolves.toBeTruthy();
    });

    it("still recognises the household's own second upload", async () => {
      const pdfSha256 = "b".repeat(64);
      await add(ours, "Piccata", { source: "PDF", pdfSha256 });

      expect(
        (await findRecipeByPdfHash(pdfSha256, ours.householdId))?.title,
      ).toBe("Piccata");
      expect(
        await findRecipeByPdfHash(pdfSha256, theirs.householdId),
      ).toBeNull();
    });

    it("does not warn about a similar title in another household", async () => {
      await add(theirs, "Chicken Piccata");

      expect(
        await findSimilarlyTitled("Chicken Piccata", ours.householdId),
      ).toEqual([]);
      expect(
        await findSimilarlyTitled("Chicken Piccata", theirs.householdId),
      ).toHaveLength(1);
    });
  });

  describe("the week", () => {
    const monday = weekStartOf(new Date("2026-03-04T12:00:00.000Z"));

    const plan = (household: { householdId: string }, recipeId: string) =>
      prisma.plannedMeal.create({
        data: {
          householdId: household.householdId,
          date: monday,
          slot: "DINNER",
          recipeId,
          servings: 4,
        },
      });

    it("lets both households book the same Tuesday dinner", async () => {
      // The constraint that made the app single-family: one row per (date,
      // slot) in the entire database. Two families sharing a calendar slot is
      // the ordinary case, not a conflict.
      await plan(ours, await add(ours, "Our Piccata"));
      await expect(
        plan(theirs, await add(theirs, "Their Dahl")),
      ).resolves.toBeTruthy();
    });

    it("shows each household only its own week", async () => {
      await plan(ours, await add(ours, "Our Piccata"));
      await plan(theirs, await add(theirs, "Their Dahl"));

      const ourWeek = await getWeekPlan(monday, ours.householdId);
      expect(ourWeek.map((m) => m.recipe?.title)).toEqual(["Our Piccata"]);
    });

    it("keeps this week's skips apart", async () => {
      await prisma.weeklySkip.create({
        data: {
          householdId: theirs.householdId,
          createdById: theirs.userId,
          name: "Milk",
          normalisedName: "milk",
          weekStart: monday,
        },
      });

      expect(await getWeeklySkips(monday, ours.householdId)).toEqual([]);
      expect(await getWeeklySkips(monday, theirs.householdId)).toHaveLength(1);
    });
  });

  describe("the pantry", () => {
    it("lets both households keep the same staple in", async () => {
      await addPantryItem("Olive oil", ours.householdId, ours.userId);
      const other = await addPantryItem(
        "Olive oil",
        theirs.householdId,
        theirs.userId,
      );
      expect(other.ok).toBe(true);
    });

    it("shows each household only its own", async () => {
      await addPantryItem("Olive oil", ours.householdId, ours.userId);
      await addPantryItem("Gochujang", theirs.householdId, theirs.userId);

      expect((await listPantryItems(ours.householdId)).map((i) => i.name)) //
        .toEqual(["Olive oil"]);
    });

    it("refuses to remove another household's staple", async () => {
      const added = await addPantryItem(
        "Gochujang",
        theirs.householdId,
        theirs.userId,
      );
      if (!added.ok) throw new Error("setup failed");

      await removePantryItem(added.item.id, ours.householdId);
      expect(await listPantryItems(theirs.householdId)).toHaveLength(1);
    });
  });

  describe("reviews", () => {
    it("refuses a review on another household's recipe", async () => {
      const id = await add(theirs, "Their Dahl");

      await expect(
        saveReview(id, ours.householdId, ours.userId, {
          stars: 1,
          body: null,
        }),
      ).rejects.toThrow(/No such recipe/);

      expect(await getReviewSummary(id)).toEqual({ average: null, count: 0 });
    });

    it("still lets every member of one household review its recipes", async () => {
      const id = await add(ours, "Our Piccata");
      const partner = await makeUser(ours.householdId);

      await saveReview(id, ours.householdId, ours.userId, {
        stars: 5,
        body: null,
      });
      await saveReview(id, ours.householdId, partner, {
        stars: 3,
        body: null,
      });

      expect(await getReviewSummary(id)).toEqual({ average: 4, count: 2 });
    });
  });

  describe("invites", () => {
    it("puts a family invite's redeemer in the sender's household", async () => {
      const { code } = await createInvite({
        createdById: ours.userId,
        householdId: ours.householdId,
      });

      const joiner = await newAccount("joiner");
      expect(await redeemInvite(code, joiner)).toBe(true);

      const detail = await getHousehold(ours.householdId);
      expect(detail?.members.map((m) => m.id)).toContain(joiner);
    });

    it("gives an outside invite's redeemer a household of their own", async () => {
      const { code } = await createInvite({
        createdById: ours.userId,
        householdId: null,
      });

      const stranger = await newAccount("stranger", "Dana");
      expect(await redeemInvite(code, stranger)).toBe(true);

      const placed = await prisma.user.findUnique({
        where: { id: stranger },
        select: { household: { select: { id: true, name: true } } },
      });
      expect(placed?.household?.id).not.toBe(ours.householdId);
      expect(placed?.household?.name).toBe("Dana's Household");
    });

    it("shares nothing with the household that sent the outside invite", async () => {
      await add(ours, "Our Piccata");

      const { code } = await createInvite({
        createdById: ours.userId,
        householdId: null,
      });
      const stranger = await newAccount("stranger");
      await redeemInvite(code, stranger);

      const placed = await prisma.user.findUnique({
        where: { id: stranger },
        select: { householdId: true },
      });
      expect(
        await searchRecipes({ householdId: placed!.householdId! }),
      ).toEqual([]);
    });

    it("says which family a code joins before it is redeemed", async () => {
      const family = await createInvite({
        createdById: ours.userId,
        householdId: ours.householdId,
      });
      const outside = await createInvite({
        createdById: ours.userId,
        householdId: null,
      });

      const { checkInvite } = await import("@/lib/invites");
      const forFamily = await checkInvite(family.code);
      const forOutside = await checkInvite(outside.code);

      expect(forFamily.ok && forFamily.householdName).toBe("Ours");
      expect(forOutside.ok && forOutside.householdName).toBeNull();
    });

    it("leaves the code usable when only one of two racing signups wins", async () => {
      const { code } = await createInvite({
        createdById: ours.userId,
        householdId: ours.householdId,
      });

      const [first, second] = await Promise.all([
        newAccount("racer-one"),
        newAccount("racer-two"),
      ]);
      const results = await Promise.all([
        redeemInvite(code, first).catch(() => false),
        redeemInvite(code, second).catch(() => false),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });
});

/** An account with no household yet - what better-auth leaves behind. */
async function newAccount(id: string, name = "Newcomer"): Promise<string> {
  const user = await prisma.user.create({
    data: {
      id,
      name,
      email: `${id}@example.com`,
      emailVerified: true,
      updatedAt: new Date(),
    },
  });
  return user.id;
}
