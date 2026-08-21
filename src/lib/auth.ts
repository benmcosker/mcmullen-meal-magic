import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { prisma } from "./db";
import { checkInvite, inviteRejectionMessage, redeemInvite } from "./invites";

const SIGN_UP_PATH = "/sign-up/email";

function readInviteCode(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const code = (body as { inviteCode?: unknown }).inviteCode;
  return typeof code === "string" ? code.trim() : "";
}

function readEmail(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const email = (body as { email?: unknown }).email;
  return typeof email === "string" ? email : "";
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  hooks: {
    // The recipe library is shared but not public: an account only exists
    // because someone already inside issued an invite. Signup is gated here
    // rather than by `disableSignUp`, which would block it outright and leave
    // no way in at all.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_UP_PATH) return;

      const code = readInviteCode(ctx.body);
      if (!code) {
        throw new APIError("FORBIDDEN", {
          message: "An invite code is required to create an account.",
        });
      }

      const result = await checkInvite(code, readEmail(ctx.body));
      if (!result.ok) {
        throw new APIError("FORBIDDEN", {
          message: inviteRejectionMessage[result.reason],
        });
      }
    }),

    // Consume the invite once the account exists.
    //
    // Validation above is not enough on its own: two people racing the same
    // code would both pass it. `redeemInvite` settles that race atomically in
    // the database, and whoever loses has their just-created account removed -
    // an account that reached this point without consuming an invite is
    // exactly what the gate exists to prevent.
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== SIGN_UP_PATH) return;

      const userId = ctx.context.newSession?.user.id;
      if (!userId) return;

      const code = readInviteCode(ctx.body);
      const redeemed = code ? await redeemInvite(code, userId) : false;

      if (!redeemed) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => {
          // Already gone, or never committed. Either way the account is not
          // usable and the error below is still the right answer.
        });

        throw new APIError("FORBIDDEN", {
          message: "That invite has already been used.",
        });
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
