import { SmsConsentSource } from "@/generated/prisma/enums";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
const available = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/sms/index", () => ({
  getSender: () => ({
    info: () => ({ id: "test", label: "Test", available: available() }),
    send,
  }),
  smsAvailable: () => available(),
}));

const { prisma } = await import("@/lib/db");
const { createRecipe } = await import("@/lib/recipe-mutations");
const { recipeInput } = await import("@/lib/recipe-schema");
const { addPantryItem } = await import("@/lib/pantry");
const { weekStartOf } = await import("@/lib/grocery");
const { shoppingListAudience, textShoppingList } =
  await import("@/lib/sms/shopping-list");
const { makeHousehold, makeUser, resetDatabase } = await import("./support/db");

const hasDb = Boolean(process.env.DATABASE_URL);
const monday = weekStartOf(new Date("2026-03-04T12:00:00.000Z"));

describe.skipIf(!hasDb)("texting the shopping list", () => {
  let householdId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    send.mockReset();
    send.mockResolvedValue({ ok: true });
    available.mockReturnValue(true);
    ({ householdId, userId } = await makeHousehold("Ours"));
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  async function planADinner(ingredients: string[]) {
    const recipeId = await createRecipe(
      recipeInput.parse({
        title: "Chicken Piccata",
        instructions: ["Cook"],
        ingredients: ingredients.map((name) => ({
          name,
          quantity: 1,
          unit: null,
        })),
        tags: [],
      }),
      householdId,
      userId,
    );
    await prisma.plannedMeal.create({
      data: {
        householdId,
        date: monday,
        slot: "DINNER",
        recipeId,
        servings: 4,
      },
    });
  }

  /**
   * Give somebody a number, and by default the agreement that goes with it.
   *
   * Consent defaults to true because that is what these tests mean by "has a
   * number" - a member who set one up and expects the list. Pass false for the
   * case where a number is on file but nobody ticked the box.
   */
  const setPhone = (id: string, phone: string | null, consent = true) =>
    prisma.user.update({
      where: { id },
      data: {
        phone,
        smsConsentAt: phone && consent ? new Date() : null,
        smsConsentSource: phone && consent ? SmsConsentSource.CHECKBOX : null,
      },
    });

  const run = () =>
    textShoppingList({
      householdId,
      weekStart: monday,
      weekLabel: "this week",
    });

  describe("who it reaches", () => {
    it("texts everybody in the household who has a number", async () => {
      // Not just whoever pressed the button: the person who plans the week is
      // routinely not the person who walks round the shop.
      const partner = await makeUser(householdId);
      await setPhone(userId, "+15551110000");
      await setPhone(partner, "+15552220000");
      await planADinner(["chicken breast"]);

      const result = await run();
      expect(result.ok).toBe(true);
      expect(send.mock.calls.map((c) => c[0]).sort()).toEqual([
        "+15551110000",
        "+15552220000",
      ]);
    });

    it("names who has no number rather than silently leaving them out", async () => {
      const partner = await makeUser(householdId);
      await setPhone(userId, "+15551110000");
      await prisma.user.update({
        where: { id: partner },
        data: { name: "Silent Sam" },
      });
      await planADinner(["chicken breast"]);

      const result = await run();
      expect(result.ok && result.withoutNumber).toEqual(["Silent Sam"]);
    });

    it("never texts another household's members", async () => {
      const other = await makeHousehold("Theirs");
      await setPhone(other.userId, "+15559990000");
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);

      await run();
      expect(send.mock.calls.map((c) => c[0])).toEqual(["+15551110000"]);
    });

    it("refuses when nobody has a number, rather than reporting success", async () => {
      await planADinner(["chicken breast"]);
      const result = await run();
      expect(result).toEqual({
        ok: false,
        error: "Nobody in the household has a phone number yet.",
      });
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe("what it sends", () => {
    it("refuses an empty week rather than texting a heading", async () => {
      await setPhone(userId, "+15551110000");
      const result = await run();
      expect(result.ok).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });

    it("leaves pantry staples out, as the on-screen list does", async () => {
      // The text and the page have to agree, or the list in your hand and the
      // list on the fridge disagree about olive oil.
      await setPhone(userId, "+15551110000");
      await addPantryItem("Olive oil", householdId, userId);
      await planADinner(["chicken breast", "olive oil"]);

      await run();
      const body = send.mock.calls[0][1] as string;
      expect(body).toContain("chicken breast");
      expect(body.toLowerCase()).not.toContain("olive oil");
    });

    it("says which week it is for", async () => {
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);

      await run();
      expect(send.mock.calls[0][1]).toContain("this week");
    });
  });

  describe("when sending goes wrong", () => {
    it("reports a partial failure as a success, naming who missed out", async () => {
      // Telling somebody the send failed when the list is already on their
      // partner's phone sends them to do the whole thing again.
      const partner = await makeUser(householdId);
      await prisma.user.update({
        where: { id: partner },
        data: { name: "Pat" },
      });
      // Through setPhone, so Pat has agreed as well as being reachable -
      // otherwise this tests the consent filter rather than the failure path.
      await setPhone(partner, "+15552220000");
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);

      send.mockImplementation(async (to: string) =>
        to === "+15552220000"
          ? { ok: false, error: "unverified number" }
          : { ok: true },
      );

      const result = await run();
      expect(result.ok).toBe(true);
      expect(result.ok && result.failed).toEqual([
        { name: "Pat", error: "unverified number" },
      ]);
    });

    it("reports a failure when nobody got it", async () => {
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);
      send.mockResolvedValue({ ok: false, error: "carrier rejected" });

      expect(await run()).toEqual({ ok: false, error: "carrier rejected" });
    });

    it("stops sending parts to somebody once one fails", async () => {
      // The rest would arrive as a numbered list with a hole in it.
      await setPhone(userId, "+15551110000");
      // Enough to split the list across several messages, and within the 200
      // the recipe schema allows.
      await planADinner(
        Array.from({ length: 150 }, (_, i) => `long ingredient name ${i}`),
      );
      send.mockResolvedValue({ ok: false, error: "carrier rejected" });

      await run();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it("does nothing at all when texting is not configured", async () => {
      available.mockReturnValue(false);
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);

      const result = await run();
      expect(result.ok).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe("when somebody has replied STOP", () => {
    /** What Twilio answers for a recipient who has opted out. */
    const stopped = {
      ok: false,
      error: "Attempt to send to unsubscribed recipient",
      code: 21610,
    };

    const consentOf = (id: string) =>
      prisma.user.findUniqueOrThrow({
        where: { id },
        select: { phone: true, smsConsentAt: true, smsConsentSource: true },
      });

    it("writes the withdrawal down instead of failing again every week", async () => {
      // Twilio answers STOP at its own edge and never tells the app, so this
      // rejection is the only notice it ever gets. Ignoring it leaves the
      // stored consent claiming a permission that was withdrawn.
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);
      send.mockResolvedValue(stopped);

      await run();

      const after = await consentOf(userId);
      expect(after.smsConsentAt).toBeNull();
      expect(after.smsConsentSource).toBeNull();
    });

    it("keeps their number, so agreeing again is a tick not a retype", async () => {
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);
      send.mockResolvedValue(stopped);

      await run();

      expect((await consentOf(userId)).phone).toBe("+15551110000");
    });

    it("stops including them once the withdrawal is recorded", async () => {
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);
      send.mockResolvedValue(stopped);
      await run();

      const audience = await shoppingListAudience(householdId);
      expect(audience.recipients).toEqual([]);
      expect(audience.withoutConsent).toEqual(["Cook"]);
    });

    it("names them apart from a send that actually went wrong", async () => {
      // One asked to stop and one could not be reached: the first needs
      // nothing doing about it, the second might.
      const partner = await makeUser(householdId);
      await prisma.user.update({
        where: { id: partner },
        data: { name: "Pat" },
      });
      await setPhone(partner, "+15552220000");
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);

      send.mockImplementation(async (to: string) =>
        to === "+15552220000" ? stopped : { ok: true },
      );

      const result = await run();
      expect(result.ok && result.unsubscribed).toEqual(["Pat"]);
      expect(result.ok && result.failed).toEqual([]);
      expect(result.ok && result.delivered).toEqual(["Cook"]);
    });

    it("leaves consent alone when the failure was anything else", async () => {
      // An unreachable handset or a bad number is a transient problem, and
      // treating it as a withdrawal would quietly unsubscribe somebody who
      // never asked to be.
      await setPhone(userId, "+15551110000");
      await planADinner(["chicken breast"]);
      send.mockResolvedValue({
        ok: false,
        error: "unknown destination",
        code: 30005,
      });

      await run();

      expect((await consentOf(userId)).smsConsentAt).not.toBeNull();
    });

    it("says so plainly when the only recipient had stopped", async () => {
      // "The message could not be sent" would send somebody hunting for a
      // fault in the app when the answer is that Pat asked them not to.
      await setPhone(userId, "+15551110000");
      await prisma.user.update({
        where: { id: userId },
        data: { name: "Pat" },
      });
      await planADinner(["chicken breast"]);
      send.mockResolvedValue(stopped);

      const result = await run();
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toMatch(/Pat replied STOP/);
    });
  });

  describe("shoppingListAudience", () => {
    it("separates who can be reached from who cannot", async () => {
      const partner = await makeUser(householdId);
      await prisma.user.update({
        where: { id: partner },
        data: { name: "Pat" },
      });
      await setPhone(userId, "+15551110000");

      const { recipients, withoutNumber } =
        await shoppingListAudience(householdId);
      expect(recipients.map((r) => r.phone)).toEqual(["+15551110000"]);
      expect(withoutNumber).toEqual(["Pat"]);
    });
  });
});
