import { prisma } from "./db";

/**
 * A ceiling on how many recipe cards one person can send to the model in a day.
 *
 * Reading a card is the only thing this app does that costs money every time
 * it happens, and `/api/upload` is reachable by anyone with an account. With
 * one household that is a theoretical problem; with thirty it is somebody
 * else's enthusiasm arriving on your bill.
 *
 * The ceiling is deliberately far above ordinary use. It is not there to shape
 * how people add recipes - a household joining and typing up twenty cards in
 * an evening should sail through it - only to stop a runaway loop or a bored
 * afternoon from being unbounded.
 */

/** Generous for a person, bounded for a bill. */
export const DEFAULT_DAILY_UPLOADS = 30;

/**
 * The limit in force, overridable per deployment.
 *
 * Read per call rather than at module load, so a deployment can change it
 * without a rebuild - the same reason the SMS sender resolves its credentials
 * per send.
 */
export function dailyUploadLimit(): number {
  const raw = process.env.UPLOAD_DAILY_LIMIT?.trim();
  if (!raw) return DEFAULT_DAILY_UPLOADS;

  const parsed = Number(raw);
  // A malformed value falls back rather than throwing or, worse, becoming NaN
  // and letting every comparison through.
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_DAILY_UPLOADS;
  return parsed;
}

export type QuotaClaim =
  | { ok: true; used: number; limit: number }
  | { ok: false; limit: number; retryAfterSeconds: number };

/** Midnight UTC on the day a moment falls in. */
export function utcDay(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Take one card off today's allowance, or say the allowance is spent.
 *
 * The increment and the check are one statement on purpose. Reading the count
 * and then writing it back would let two uploads that arrive together both see
 * the same number and both proceed, which on a serverless host running several
 * instances is not a rare case - it is what a burst looks like.
 *
 * A refused attempt still increments. That is the conservative direction: the
 * counter measures what was asked for rather than what was granted, so
 * hammering the endpoint cannot walk the count back down into range.
 */
export async function claimUploadSlot(
  userId: string,
  now: Date = new Date(),
): Promise<QuotaClaim> {
  const limit = dailyUploadLimit();
  const day = utcDay(now);

  const row = await prisma.uploadQuota.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (row.count > limit) {
    const tomorrow = new Date(day);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return {
      ok: false,
      limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((tomorrow.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  return { ok: true, used: row.count, limit };
}
