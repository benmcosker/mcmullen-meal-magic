import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  claimUploadSlot,
  DEFAULT_DAILY_UPLOADS,
  dailyUploadLimit,
  utcDay,
} from "@/lib/upload-quota";

import { makeHousehold, resetDatabase } from "./support/db";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("dailyUploadLimit", () => {
  const env = process.env.UPLOAD_DAILY_LIMIT;
  afterEach(() => {
    if (env === undefined) delete process.env.UPLOAD_DAILY_LIMIT;
    else process.env.UPLOAD_DAILY_LIMIT = env;
  });

  it("takes a deployment's own number", () => {
    process.env.UPLOAD_DAILY_LIMIT = "5";
    expect(dailyUploadLimit()).toBe(5);
  });

  it("falls back rather than letting a bad value disable the limit", () => {
    // "abc" would become NaN, and every `count > NaN` is false - which is the
    // limit silently switching itself off, the one failure worth ruling out.
    for (const bad of ["abc", "0", "-3", "2.5", "  "]) {
      process.env.UPLOAD_DAILY_LIMIT = bad;
      expect(dailyUploadLimit()).toBe(DEFAULT_DAILY_UPLOADS);
    }
  });
});

describe("utcDay", () => {
  it("collapses a moment to the day it falls in", () => {
    expect(utcDay(new Date("2026-09-01T23:59:59.000Z")).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(utcDay(new Date("2026-09-02T00:00:00.000Z")).toISOString()).toBe(
      "2026-09-02T00:00:00.000Z",
    );
  });
});

describe.skipIf(!hasDb)("claimUploadSlot", () => {
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    process.env.UPLOAD_DAILY_LIMIT = "3";
    ({ userId } = await makeHousehold("Ours"));
  });

  afterAll(async () => {
    delete process.env.UPLOAD_DAILY_LIMIT;
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("counts up to the limit and then refuses", async () => {
    for (let i = 1; i <= 3; i += 1) {
      const claim = await claimUploadSlot(userId);
      expect(claim).toEqual({ ok: true, used: i, limit: 3 });
    }

    const refused = await claimUploadSlot(userId);
    expect(refused.ok).toBe(false);
  });

  it("says how long the wait is, in whole seconds until midnight UTC", async () => {
    const now = new Date("2026-09-01T23:59:00.000Z");
    for (let i = 0; i < 3; i += 1) await claimUploadSlot(userId, now);

    const refused = await claimUploadSlot(userId, now);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.retryAfterSeconds).toBe(60);
  });

  it("gives everybody their own allowance", async () => {
    // A household is people who trust each other; a shared ceiling would let
    // one of them spend the others' allowance.
    const other = await makeHousehold("Theirs");
    for (let i = 0; i < 3; i += 1) await claimUploadSlot(userId);

    expect((await claimUploadSlot(userId)).ok).toBe(false);
    expect((await claimUploadSlot(other.userId)).ok).toBe(true);
  });

  it("starts again the next day", async () => {
    const monday = new Date("2026-09-01T12:00:00.000Z");
    for (let i = 0; i < 3; i += 1) await claimUploadSlot(userId, monday);
    expect((await claimUploadSlot(userId, monday)).ok).toBe(false);

    const tuesday = new Date("2026-09-02T00:00:01.000Z");
    expect(await claimUploadSlot(userId, tuesday)).toEqual({
      ok: true,
      used: 1,
      limit: 3,
    });
  });

  it("keeps counting past the limit rather than letting it be walked back", async () => {
    // A refused attempt still increments, so hammering the endpoint cannot
    // bring the count back into range.
    for (let i = 0; i < 6; i += 1) await claimUploadSlot(userId);

    const row = await prisma.uploadQuota.findFirstOrThrow({
      where: { userId },
    });
    expect(row.count).toBe(6);
    expect((await claimUploadSlot(userId)).ok).toBe(false);
  });

  it("does not lose a claim when two arrive together", async () => {
    // Read-then-write would let both see the same number. On a host running
    // several instances that is not a rare race, it is what a burst is.
    process.env.UPLOAD_DAILY_LIMIT = "50";
    await Promise.all(
      Array.from({ length: 10 }, () => claimUploadSlot(userId)),
    );

    const row = await prisma.uploadQuota.findFirstOrThrow({
      where: { userId },
    });
    expect(row.count).toBe(10);
  });
});
