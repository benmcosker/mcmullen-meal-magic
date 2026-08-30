import { prisma } from "../db";
import {
  aggregateIngredients,
  buildExclusions,
  getWeekPlan,
  getWeeklySkips,
} from "../grocery";
import { listPantryItems } from "../pantry";
import { formatAsPlainText } from "../shopping/format";
import { getSender, smsAvailable } from "./index";
import { shoppingListMessage, splitMessage } from "./message";
import type { SendOutcome, SmsRecipient } from "./types";

export type TextListResult =
  | {
      ok: true;
      /** How many messages each person received. */
      parts: number;
      delivered: string[];
      /** Named individually: a partial failure is not a failure. */
      failed: { name: string; error: string }[];
      /** Members with no number on file, so the gap is visible. */
      withoutNumber: string[];
      /** Members who have a number but have not agreed to be texted. */
      withoutConsent: string[];
    }
  | { ok: false; error: string };

/**
 * Everyone in the household who may be texted, and everyone who may not.
 *
 * A number is not permission. Somebody can have one on file and still not have
 * agreed to receive texts - they never ticked the box, or they unticked it -
 * and sending to them anyway is both a broken promise and the thing US
 * carriers register campaigns to prevent.
 *
 * The two ways of being left out are reported apart because they need
 * different things from the person: one has to add a number, the other has to
 * agree. Telling somebody who has typed their number that they have no number
 * saved sends them to type it again.
 */
export async function shoppingListAudience(householdId: string): Promise<{
  recipients: SmsRecipient[];
  /** In the household, but there is nowhere to send it. */
  withoutNumber: string[];
  /** Reachable, but has not agreed to be. */
  withoutConsent: string[];
}> {
  const members = await prisma.user.findMany({
    where: { householdId },
    select: { name: true, phone: true, smsConsentAt: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    recipients: members
      .filter(
        (m): m is { name: string; phone: string; smsConsentAt: Date } =>
          Boolean(m.phone) && m.smsConsentAt !== null,
      )
      .map((m) => ({ name: m.name, phone: m.phone })),
    withoutNumber: members.filter((m) => !m.phone).map((m) => m.name),
    withoutConsent: members
      .filter((m) => m.phone && m.smsConsentAt === null)
      .map((m) => m.name),
  };
}

/**
 * Text a week's shopping to everyone in the household who has a number.
 *
 * Everyone rather than just whoever pressed the button: the list is the
 * household's, and the person who plans the week is routinely not the person
 * who walks round the shop.
 *
 * The list is built here rather than taken from the client, for the same
 * reason every other write is: what gets sent should be what the week actually
 * says, not what a page believed it said some minutes ago.
 */
export async function textShoppingList(params: {
  householdId: string;
  weekStart: Date;
  weekLabel: string;
}): Promise<TextListResult> {
  if (!smsAvailable()) {
    return { ok: false, error: "Texting is not set up for this deployment." };
  }

  const [meals, pantry, skips] = await Promise.all([
    getWeekPlan(params.weekStart, params.householdId),
    listPantryItems(params.householdId),
    getWeeklySkips(params.weekStart, params.householdId),
  ]);

  const lines = aggregateIngredients(meals, buildExclusions(pantry, skips));
  if (lines.length === 0) {
    return {
      ok: false,
      error: "Nothing planned this week, so there is nothing to send.",
    };
  }

  const { recipients, withoutNumber, withoutConsent } =
    await shoppingListAudience(params.householdId);
  if (recipients.length === 0) {
    return {
      ok: false,
      error: withoutConsent.length
        ? "Nobody has agreed to be texted yet. Tick the box on the Household page to turn it on."
        : "Nobody in the household has a phone number yet.",
    };
  }

  const parts = splitMessage(
    shoppingListMessage(params.weekLabel, formatAsPlainText(lines)),
  );
  const sender = getSender();

  // One person at a time, and their parts in order. Sending everything at once
  // would be faster and would also let a numbered list arrive shuffled, which
  // for a list split across three messages is worse than waiting.
  const outcomes: SendOutcome[] = [];
  for (const recipient of recipients) {
    let failure: string | null = null;
    for (const part of parts) {
      const result = await sender.send(recipient.phone, part);
      if (!result.ok) {
        failure = result.error;
        break;
      }
    }
    outcomes.push(
      failure
        ? { ok: false, recipient, error: failure }
        : { ok: true, recipient, parts: parts.length },
    );
  }

  const delivered = outcomes.filter((o) => o.ok).map((o) => o.recipient.name);
  const failed = outcomes
    .filter((o): o is Extract<SendOutcome, { ok: false }> => !o.ok)
    .map((o) => ({ name: o.recipient.name, error: o.error }));

  // Reported as a success with the failures named, rather than an outright
  // failure, when anybody got it: telling somebody the send failed when the
  // list is already on their partner's phone sends them to do it again.
  if (delivered.length === 0) {
    return {
      ok: false,
      error: failed[0]?.error ?? "The message could not be sent.",
    };
  }

  return {
    ok: true,
    parts: parts.length,
    delivered,
    failed,
    withoutNumber,
    withoutConsent,
  };
}
