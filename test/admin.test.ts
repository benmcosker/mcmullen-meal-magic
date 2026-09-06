import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { adminOverview, adminEmails, isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

import { makeHousehold, makeUser, resetDatabase as reset } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("who is an admin", () => {
  const env = (ADMIN_EMAILS: string) => ({ ADMIN_EMAILS });

  it("reads a comma-separated list", () => {
    expect(adminEmails(env("a@example.com, b@example.com"))).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("ignores case and surrounding space, because a person typed it", () => {
    expect(isAdmin("Ben@Example.com", env("  ben@example.com "))).toBe(true);
    expect(isAdmin(" ben@example.com", env("BEN@EXAMPLE.COM"))).toBe(true);
  });

  it("lets nobody in when the variable is unset or empty", () => {
    expect(isAdmin("ben@example.com", {})).toBe(false);
    expect(isAdmin("ben@example.com", env(""))).toBe(false);
    expect(isAdmin("ben@example.com", env(" , , "))).toBe(false);
  });

  it("has no answer for a missing address", () => {
    expect(isAdmin(null, env("ben@example.com"))).toBe(false);
    expect(isAdmin("", env("ben@example.com"))).toBe(false);
    expect(isAdmin("   ", env("ben@example.com"))).toBe(false);
  });

  it("does not match on a prefix or a lookalike domain", () => {
    const list = env("ben@example.com");
    expect(isAdmin("ben@example.com.evil.test", list)).toBe(false);
    expect(isAdmin("ben@example.co", list)).toBe(false);
    expect(isAdmin("notben@example.com", list)).toBe(false);
  });
});

describe.skipIf(!hasDb)("the activity overview", () => {
  beforeEach(reset);
  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("counts recipes by how they arrived", async () => {
    const { householdId, userId } = await makeHousehold("Cooks");
    for (const source of ["MANUAL", "MANUAL", "PDF", "PHOTO"] as const) {
      await prisma.recipe.create({
        data: {
          title: `${source} dish`,
          servings: 4,
          source,
          householdId,
          createdById: userId,
        },
      });
    }

    const [only] = await adminOverview();
    expect(only.recipes).toEqual({ total: 4, manual: 2, pdf: 1, photo: 1 });
  });

  it("reports planner use per household, since a meal records no author", async () => {
    const { householdId } = await makeHousehold("Cooks");
    await prisma.plannedMeal.create({
      data: {
        date: new Date("2026-09-07T00:00:00.000Z"),
        slot: "DINNER",
        servings: 4,
        householdId,
        customTitle: "Something",
      },
    });

    const [only] = await adminOverview();
    expect(only.planner.mealsPlanned).toBe(1);
    expect(only.planner.lastPlannedAt).toBeInstanceOf(Date);
  });

  it("says never used rather than nothing at all", async () => {
    await makeHousehold("Quiet");
    const [only] = await adminOverview();
    expect(only.planner).toEqual({ mealsPlanned: 0, lastPlannedAt: null });
    expect(only.recipes.total).toBe(0);
    expect(only.uploadAttempts).toBe(0);
  });

  it("sums card reads across everyone in the household", async () => {
    const { householdId, userId } = await makeHousehold("Cooks");
    const second = await makeUser(householdId);
    await prisma.uploadQuota.createMany({
      data: [
        { userId, day: new Date("2026-09-01T00:00:00.000Z"), count: 3 },
        { userId, day: new Date("2026-09-02T00:00:00.000Z"), count: 2 },
        { userId: second, day: new Date("2026-09-02T00:00:00.000Z"), count: 5 },
      ],
    });

    const [only] = await adminOverview();
    expect(only.uploadAttempts).toBe(10);
  });

  it("carries no recipe titles, plans or phone numbers", async () => {
    const { householdId, userId } = await makeHousehold("Cooks");
    await prisma.recipe.create({
      data: {
        title: "A Very Secret Lasagne",
        servings: 4,
        householdId,
        createdById: userId,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { phone: "+15550001111", smsConsentAt: new Date() },
    });

    const dump = JSON.stringify(await adminOverview());
    expect(dump).not.toContain("Very Secret Lasagne");
    expect(dump).not.toContain("5550001111");
    // What it does say about texting is only whether they agreed.
    expect(dump).toContain('"agreedToTexts":true');
  });

  it("counts texts as sent, which is all the app can know", async () => {
    const { householdId, userId } = await makeHousehold("Cooks");
    await prisma.shoppingText.createMany({
      data: [
        {
          weekStart: new Date("2026-08-31T00:00:00.000Z"),
          itemCount: 12,
          partCount: 2,
          acceptedFor: 2,
          refusedFor: 0,
          householdId,
          createdById: userId,
        },
        {
          weekStart: new Date("2026-09-07T00:00:00.000Z"),
          itemCount: 9,
          partCount: 1,
          acceptedFor: 1,
          refusedFor: 1,
          householdId,
          createdById: userId,
        },
      ],
    });

    const [only] = await adminOverview();
    expect(only.texts.sent).toBe(2);
    expect(only.texts.lastSentAt).toBeInstanceOf(Date);
  });

  it("says never for a household that has not texted", async () => {
    await makeHousehold("Quiet");
    const [only] = await adminOverview();
    expect(only.texts).toEqual({ sent: 0, lastSentAt: null });
  });

  it("keeps each household's numbers to itself", async () => {
    const a = await makeHousehold("A");
    await makeHousehold("B");
    await prisma.recipe.create({
      data: {
        title: "Only A's",
        servings: 4,
        householdId: a.householdId,
        createdById: a.userId,
      },
    });

    const overview = await adminOverview();
    expect(overview).toHaveLength(2);
    expect(overview.find((h) => h.name === "A")?.recipes.total).toBe(1);
    expect(overview.find((h) => h.name === "B")?.recipes.total).toBe(0);
  });
});
