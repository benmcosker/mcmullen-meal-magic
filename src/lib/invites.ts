import { randomBytes } from "node:crypto";

import { prisma } from "./db";

/** How long a freshly minted invite stays redeemable. */
export const INVITE_TTL_DAYS = 14;

export type InviteCheck =
  { ok: true; inviteId: string } | { ok: false; reason: InviteRejection };

export type InviteRejection =
  "unknown" | "already_redeemed" | "expired" | "wrong_email";

export const inviteRejectionMessage: Record<InviteRejection, string> = {
  unknown: "That invite code is not valid.",
  already_redeemed: "That invite has already been used.",
  expired: "That invite has expired. Ask for a new one.",
  wrong_email: "That invite was issued for a different email address.",
};

/**
 * URL-safe, unambiguous invite code.
 *
 * 16 chars from a 32-symbol alphabet is 80 bits - far beyond guessing, while
 * still being something you can read down the phone. Excludes I/L/O/U and 0/1
 * to avoid the characters people most often transcribe wrongly.
 */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const bytes = randomBytes(16);
  let code = "";
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

export async function createInvite(params: {
  createdById: string;
  email?: string | null;
}): Promise<{ code: string; expiresAt: Date }> {
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const invite = await prisma.invite.create({
    data: {
      code: generateInviteCode(),
      email: normaliseEmail(params.email) || null,
      expiresAt,
      createdById: params.createdById,
    },
  });

  return { code: invite.code, expiresAt: invite.expiresAt };
}

/**
 * Validate an invite without consuming it, so the signup form can reject a bad
 * code before asking for a password.
 */
export async function checkInvite(
  code: string,
  email?: string,
): Promise<InviteCheck> {
  const invite = await prisma.invite.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!invite) return { ok: false, reason: "unknown" };
  if (invite.redeemedAt) return { ok: false, reason: "already_redeemed" };
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (
    invite.email &&
    email &&
    normaliseEmail(invite.email) !== normaliseEmail(email)
  ) {
    return { ok: false, reason: "wrong_email" };
  }

  return { ok: true, inviteId: invite.id };
}

/**
 * Consume an invite for a newly created user.
 *
 * The update is conditional on `redeemedAt` still being null, so two signups
 * racing on the same code cannot both succeed - the loser matches zero rows.
 * `redeemedById` is unique in the schema as a second line of defence.
 */
export async function redeemInvite(
  code: string,
  userId: string,
): Promise<boolean> {
  const { count } = await prisma.invite.updateMany({
    where: { code: code.trim().toUpperCase(), redeemedAt: null },
    data: { redeemedAt: new Date(), redeemedById: userId },
  });

  return count === 1;
}

function normaliseEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}
