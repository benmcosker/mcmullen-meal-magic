import { prisma } from "./db";

/**
 * A household's name when nobody has chosen one.
 *
 * Derived from whoever it was created for, because "Household" on its own tells
 * a member nothing and there is no point asking someone to name their family
 * before they have seen the app. Renaming it later is one field on the
 * household page.
 */
export function defaultHouseholdName(memberName: string): string {
  const name = memberName.trim();
  if (!name) return "My Household";

  // "Ben" -> "Ben's Household"; "Chris" -> "Chris' Household".
  const suffix = name.endsWith("s") ? "'" : "'s";
  return `${name}${suffix} Household`;
}

export type HouseholdMember = {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
};

export type HouseholdDetail = {
  id: string;
  name: string;
  members: HouseholdMember[];
};

export async function getHousehold(
  householdId: string,
): Promise<HouseholdDetail | null> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      members: {
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!household) return null;

  return {
    id: household.id,
    name: household.name,
    members: household.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      joinedAt: member.createdAt,
    })),
  };
}

export const MAX_HOUSEHOLD_NAME = 80;

/** Returns the trimmed name that was saved, or null if it was blank. */
export async function renameHousehold(
  householdId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim().slice(0, MAX_HOUSEHOLD_NAME);
  if (!trimmed) return null;

  await prisma.household.update({
    where: { id: householdId },
    data: { name: trimmed },
  });
  return trimmed;
}
