import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInvite, generateInviteCode } from "@/lib/invites";

const hasDb = Boolean(process.env.DATABASE_URL);

const PASSWORD = "correct-horse-battery-staple";

/**
 * Attempt a signup and report only the HTTP status.
 *
 * A rejected signup surfaces as a thrown APIError rather than an error
 * response, so both shapes are normalised here.
 */
async function signUpStatus(params: {
  email: string;
  inviteCode?: string;
  name?: string;
  password?: string;
}): Promise<number> {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        name: params.name ?? "New User",
        email: params.email,
        password: params.password ?? PASSWORD,
        ...(params.inviteCode === undefined
          ? {}
          : { inviteCode: params.inviteCode }),
      },
      asResponse: true,
    });
    return res.status;
  } catch (error) {
    const status = (error as { statusCode?: number; status?: number | string })
      ?.statusCode;
    if (typeof status === "number") return status;
    // better-auth also reports the status as a symbolic name.
    const named = (error as { status?: string }).status;
    if (named === "FORBIDDEN") return 403;
    if (named === "BAD_REQUEST") return 400;
    throw error;
  }
}

describe.skipIf(!hasDb)("invite-gated signup", () => {
  let inviterId: string;

  beforeEach(async () => {
    await reset();
    const inviter = await prisma.user.create({
      data: {
        name: "Inviter",
        email: "inviter@example.com",
        emailVerified: true,
        id: "inviter",
        updatedAt: new Date(),
      },
    });
    inviterId = inviter.id;
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("refuses signup with no invite code at all", async () => {
    const status = await signUpStatus({ email: "nobody@example.com" });
    expect(status).toBe(403);
    expect(await userCount("nobody@example.com")).toBe(0);
  });

  it("refuses signup with an invite code that does not exist", async () => {
    const status = await signUpStatus({
      email: "nobody@example.com",
      inviteCode: generateInviteCode(),
    });
    expect(status).toBe(403);
    expect(await userCount("nobody@example.com")).toBe(0);
  });

  it("accepts signup with a valid invite and marks it redeemed", async () => {
    const { code } = await createInvite({ createdById: inviterId });

    const status = await signUpStatus({
      email: "invited@example.com",
      inviteCode: code,
    });
    expect(status).toBe(200);
    expect(await userCount("invited@example.com")).toBe(1);

    const invite = await prisma.invite.findUnique({ where: { code } });
    expect(invite?.redeemedAt).toBeInstanceOf(Date);
    expect(invite?.redeemedById).not.toBeNull();
  });

  it("refuses to let one invite create a second account", async () => {
    const { code } = await createInvite({ createdById: inviterId });

    const first = await signUpStatus({
      email: "first@example.com",
      inviteCode: code,
    });
    expect(first).toBe(200);

    const second = await signUpStatus({
      email: "second@example.com",
      inviteCode: code,
    });
    expect(second).toBe(403);

    // The critical assertion: the rejected signup must leave no account behind.
    expect(await userCount("second@example.com")).toBe(0);
  });

  it("refuses an expired invite", async () => {
    const { code } = await createInvite({ createdById: inviterId });
    await prisma.invite.update({
      where: { code },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const status = await signUpStatus({
      email: "late@example.com",
      inviteCode: code,
    });
    expect(status).toBe(403);
    expect(await userCount("late@example.com")).toBe(0);
  });

  it("refuses an email-pinned invite redeemed from another address", async () => {
    const { code } = await createInvite({
      createdById: inviterId,
      email: "intended@example.com",
    });

    const wrong = await signUpStatus({
      email: "someone@example.com",
      inviteCode: code,
    });
    expect(wrong).toBe(403);
    expect(await userCount("someone@example.com")).toBe(0);

    // The address it was actually issued to still works, case-insensitively.
    const right = await signUpStatus({
      email: "INTENDED@example.com",
      inviteCode: code,
    });
    expect(right).toBe(200);
  });

  it("accepts the code in lower case and with surrounding whitespace", async () => {
    const { code } = await createInvite({ createdById: inviterId });

    const status = await signUpStatus({
      email: "sloppy@example.com",
      inviteCode: `  ${code.toLowerCase()}  `,
    });
    expect(status).toBe(200);
  });

  it("survives two signups racing the same invite", async () => {
    const { code } = await createInvite({ createdById: inviterId });

    const statuses = await Promise.all([
      signUpStatus({ email: "racer-a@example.com", inviteCode: code }),
      signUpStatus({ email: "racer-b@example.com", inviteCode: code }),
    ]);
    // Exactly one account, no matter how the race lands.
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(
      await prisma.user.count({ where: { email: { contains: "racer-" } } }),
    ).toBe(1);
  });
});

describe("generateInviteCode", () => {
  it("avoids characters that are easy to transcribe wrongly", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(16);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTVWXYZ23456789]+$/);
  });

  it("does not repeat", () => {
    const codes = new Set(Array.from({ length: 500 }, generateInviteCode));
    expect(codes.size).toBe(500);
  });
});

async function userCount(email: string): Promise<number> {
  return prisma.user.count({ where: { email: email.toLowerCase() } });
}

async function reset() {
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
}
