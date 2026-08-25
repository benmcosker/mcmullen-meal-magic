/**
 * Phone numbers, stored the one way a carrier will accept them.
 *
 * E.164: a plus, a country code, then the national number, no punctuation -
 * "+15551234567". Everything a person might type is normalised to that on the
 * way in, because a number stored as "(555) 123-4567" is a number that cannot
 * be sent to without guessing at parse time, every time.
 *
 * Deliberately not a full parsing library. libphonenumber is 500KB to answer a
 * question this app asks about two people who both live in one country. What
 * is here handles the shapes a household actually types and refuses the rest
 * rather than guessing - a wrong number is worse than a rejected one, since
 * the shopping list would go silently to a stranger.
 */

/**
 * Assumed when someone types a bare national number.
 *
 * A household is in one country; asking them to type "+1" every time to
 * satisfy a parser is the kind of correctness that reads as pedantry. Anyone
 * elsewhere types their own "+" prefix and is believed.
 */
export const DEFAULT_COUNTRY_CODE = "1";

/** Longest an E.164 number can be, country code included. */
const MAX_E164_DIGITS = 15;
const MIN_E164_DIGITS = 8;

export type PhoneParse =
  { ok: true; e164: string } | { ok: false; reason: string };

/**
 * Normalise what somebody typed into E.164, or say why it cannot be.
 *
 * Accepts the ways a number is ordinarily written - spaces, dashes, brackets,
 * dots, a leading "+" or "00" - and the two North American habits of a leading
 * 1 and of omitting the country code entirely.
 */
export function parsePhone(input: string): PhoneParse {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "Enter a phone number." };

  // "00" is how much of the world writes "+". Normalise before stripping, or
  // the leading zeros look like part of the number.
  const withPlus = trimmed.replace(/^00/, "+");
  const explicitCountry = withPlus.startsWith("+");

  const digits = withPlus.replace(/\D/g, "");
  if (!digits) return { ok: false, reason: "That has no digits in it." };

  if (/[a-z]/i.test(trimmed.replace(/^\+/, ""))) {
    // "555-EAT-FOOD" and similar. Refused rather than mapped off a keypad:
    // guessing here sends the shopping list to whoever owns the number it
    // guessed.
    return { ok: false, reason: "Use digits rather than letters." };
  }

  const national =
    explicitCountry || digits.length > 10
      ? digits
      : `${DEFAULT_COUNTRY_CODE}${digits}`;

  if (national.length < MIN_E164_DIGITS) {
    return { ok: false, reason: "That number looks too short." };
  }
  if (national.length > MAX_E164_DIGITS) {
    return { ok: false, reason: "That number looks too long." };
  }
  if (national.startsWith("0")) {
    return { ok: false, reason: "Start with a country code, or a plus." };
  }

  return { ok: true, e164: `+${national}` };
}

/**
 * E.164 back into something a person recognises as their own number.
 *
 * Only North American numbers get grouped, because those are the only ones
 * whose shape is known here. Everything else is shown as stored, which is
 * correct if unlovely - inventing grouping for a number whose format is
 * unknown makes it harder to read, not easier.
 */
export function formatPhone(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (!match) return e164;
  return `(${match[1]}) ${match[2]}-${match[3]}`;
}
