/**
 * The facts a carrier needs stated, kept in one place.
 *
 * US carriers require an A2P 10DLC campaign registration before they will
 * carry application-sent texts, and registration is reviewed by a person who
 * compares three things: the consent box a user actually ticks, the public
 * page describing the opt-in, and the privacy policy. If the wording differs
 * between them the campaign is rejected, so all three read from here rather
 * than restating it and drifting apart.
 *
 * A plain module with no directive, so the server-rendered legal pages and the
 * client-side opt-in forms can both import it - the same reasoning as
 * `theme/page.ts`.
 */

/** The name on the campaign registration. These have to match. */
export const BRAND = "McMullen Meal Magic";

/** Where HELP and privacy questions go. Must be an address somebody reads. */
export const CONTACT_EMAIL = "benmcosker@gmail.com";

/**
 * What people are told to expect, and what the app must then stay under.
 *
 * A week's list is one message in the ordinary case and two when the shop is
 * long - `splitMessage` breaks at 1200 characters - and it is sent once a
 * week. "Up to 2 messages a week" is the true ceiling rather than a
 * comfortable-sounding number, which matters: the frequency claim is one of
 * the things a carrier will hold you to.
 */
export const SMS_FREQUENCY = "up to 2 messages a week";

/** What the messages actually are. Vagueness here reads as a marketing list. */
export const SMS_PURPOSE =
  "your household's weekly grocery shopping list, sent when someone in your household asks for it";

/**
 * The sentence beside the checkbox.
 *
 * Written as something a person can act on rather than a legal formula, but it
 * carries the two things that must be there: who is texting, and how often.
 */
export const SMS_CONSENT_LABEL =
  `Yes, text me my household's weekly shopping list from ${BRAND}. ` +
  `I understand I will receive ${SMS_FREQUENCY}.`;

/** Message-and-data-rates. Required, and required to be in these words. */
export const SMS_RATES =
  "Message and data rates may apply, depending on your mobile plan.";

/** How to get help and how to stop. Twilio answers both automatically. */
export const SMS_HELP_STOP =
  "Reply HELP for help or STOP to cancel at any time. " +
  `You can also clear your number on the Household page, or email ${CONTACT_EMAIL}.`;

/**
 * The non-sharing promise.
 *
 * Carriers require this stated explicitly in the privacy policy, and it is the
 * single most common reason a campaign is rejected. It is also simply true of
 * this app: the only place a number goes is Twilio, to carry the message.
 */
export const SMS_NO_SHARING =
  "Mobile numbers and consent to receive text messages are never shared with " +
  "third parties or affiliates for marketing or promotional purposes.";

/** Shown at the foot of each policy so a reviewer can see it is current. */
export const LEGAL_UPDATED = "30 August 2026";
