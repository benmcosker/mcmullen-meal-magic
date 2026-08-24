"use server";

import { revalidatePath } from "next/cache";

import { createInvite, revokeInvite } from "@/lib/invites";
import { renameHousehold } from "@/lib/household";
import { requireHousehold } from "@/lib/session";

export type InviteKind = "family" | "outside";

export type CreatedInvite = {
  code: string;
  expiresAt: string;
  kind: InviteKind;
  /** The name the new household will take, when the sender chose one. */
  householdName: string | null;
};

export type InviteResult =
  { ok: true; invite: CreatedInvite } | { ok: false; error: string };

/**
 * Mint a code for someone.
 *
 * The two kinds differ in one thing, and it is the thing worth being careful
 * about: a family invite hands over everything this household can see, and an
 * outside one hands over nothing at all. The kind is decided here from the
 * sender's own household rather than taken from the client, so a tampered form
 * post cannot add someone to a family they were never invited to.
 */
export async function createInviteAction(
  kind: InviteKind,
  email?: string,
  householdName?: string,
): Promise<InviteResult> {
  const user = await requireHousehold();

  const trimmed = email?.trim() ?? "";
  if (trimmed && !trimmed.includes("@")) {
    return { ok: false, error: "That does not look like an email address." };
  }

  const invite = await createInvite({
    createdById: user.id,
    householdId: kind === "family" ? user.householdId : null,
    householdName: kind === "outside" ? householdName : null,
    email: trimmed || null,
  });

  revalidatePath("/household");
  return {
    ok: true,
    invite: {
      code: invite.code,
      expiresAt: invite.expiresAt.toISOString(),
      kind,
      householdName: kind === "outside" ? householdName?.trim() || null : null,
    },
  };
}

export type RenameResult =
  { ok: true; name: string } | { ok: false; error: string };

export async function renameHouseholdAction(
  name: string,
): Promise<RenameResult> {
  const user = await requireHousehold();

  const saved = await renameHousehold(user.householdId, name);
  if (!saved) return { ok: false, error: "Give the household a name." };

  revalidatePath("/household");
  return { ok: true, name: saved };
}

/** Withdraw a code before anyone uses it. */
export async function revokeInviteAction(id: string): Promise<void> {
  const user = await requireHousehold();
  await revokeInvite(id, user.id);
  revalidatePath("/household");
}
