import { prisma } from "./db";

/**
 * Who may see the overview.
 *
 * An environment variable rather than a column on the user: nobody can grant
 * themselves the role through the app, there is no "make admin" button to
 * defend, and taking it away is a deploy rather than a database edit somebody
 * has to remember to make.
 *
 * Compared case-insensitively, because an email address is typed by a person
 * and "Ben@" and "ben@" are the same inbox.
 */
export function adminEmails(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const address = email?.trim().toLowerCase();
  if (!address) return false;
  return adminEmails(env).includes(address);
}

export type AdminMember = {
  name: string;
  email: string;
  /**
   * The most recent session this person started, or null.
   *
   * Expired sessions are cleaned up, so null reads as "not lately" rather than
   * "never" - it cannot tell a new account from a dormant one.
   */
  lastSignInAt: Date | null;
  agreedToTexts: boolean;
};

export type AdminHousehold = {
  id: string;
  name: string;
  createdAt: Date;
  members: AdminMember[];
  /** Recipes this household owns, split by how they arrived. */
  recipes: { total: number; manual: number; pdf: number; photo: number };
  /**
   * Meals on the planner, ever. A household fact rather than a personal one:
   * a planned meal records the household and the date, not who chose it.
   */
  planner: { mealsPlanned: number; lastPlannedAt: Date | null };
  /**
   * Card reads charged against the daily quota, summed over the household.
   *
   * Attempts, not recipes: a refused or unreadable card still spends one, so
   * this sits above the PDF and photo counts rather than matching them.
   */
  uploadAttempts: number;
};

/**
 * Every household, and how much use each is getting.
 *
 * Deliberately nothing but counts and dates. No recipe titles, no plans, no
 * shopping lists, no phone numbers - the privacy policy says recipes and plans
 * are visible to the members of the same household, and this view has to leave
 * that true rather than make it a promise an administrator is trusted to keep.
 *
 * Read in a handful of grouped queries and stitched here. A household and its
 * members are small enough that the joins are not worth the SQL.
 */
export async function adminOverview(): Promise<AdminHousehold[]> {
  const [households, recipeCounts, plannerCounts, quotas] = await Promise.all([
    prisma.household.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        members: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            smsConsentAt: true,
            sessions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    }),
    prisma.recipe.groupBy({
      by: ["householdId", "source"],
      _count: { _all: true },
    }),
    prisma.plannedMeal.groupBy({
      by: ["householdId"],
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.uploadQuota.groupBy({ by: ["userId"], _sum: { count: true } }),
  ]);

  const attemptsByUser = new Map(
    quotas.map((row) => [row.userId, row._sum.count ?? 0]),
  );
  const plannerByHousehold = new Map(
    plannerCounts.map((row) => [row.householdId, row]),
  );

  return households.map((household) => {
    const recipes = { total: 0, manual: 0, pdf: 0, photo: 0 };
    for (const row of recipeCounts) {
      if (row.householdId !== household.id) continue;
      const n = row._count._all;
      recipes.total += n;
      if (row.source === "MANUAL") recipes.manual += n;
      if (row.source === "PDF") recipes.pdf += n;
      if (row.source === "PHOTO") recipes.photo += n;
    }

    const planned = plannerByHousehold.get(household.id);

    return {
      id: household.id,
      name: household.name,
      createdAt: household.createdAt,
      members: household.members.map((member) => ({
        name: member.name,
        email: member.email,
        lastSignInAt: member.sessions[0]?.createdAt ?? null,
        agreedToTexts: member.smsConsentAt != null,
      })),
      recipes,
      planner: {
        mealsPlanned: planned?._count._all ?? 0,
        lastPlannedAt: planned?._max.createdAt ?? null,
      },
      uploadAttempts: household.members.reduce(
        (total, member) => total + (attemptsByUser.get(member.id) ?? 0),
        0,
      ),
    };
  });
}
