import { consoleSender } from "./console";
import { twilioSender } from "./twilio";
import type { SmsSender } from "./types";

/**
 * Whether the log-only sender counts as a working one.
 *
 * Without this the console sender is unreachable, which makes it useless: the
 * feature is gated on being able to send, so in development - where nobody has
 * Twilio credentials - the button never appears and the whole flow cannot be
 * exercised at all. That was the shape of it until trying to look at the page
 * proved otherwise.
 *
 * Refused outright in production, whatever the variable says. The failure this
 * guards against is somebody believing the shopping list went out when it only
 * went to a log, and that is worth more than the convenience of an override.
 */
function logOnlyEnabled(): boolean {
  return (
    process.env.SMS_LOG_ONLY === "true" && process.env.NODE_ENV !== "production"
  );
}

/**
 * The sender this deployment will use.
 *
 * Resolved per call rather than at module load, because the environment is
 * read at runtime and a module cached from build time would answer for the
 * wrong one.
 */
export function getSender(): SmsSender {
  return twilioSender.info().available ? twilioSender : consoleSender;
}

/** Whether this deployment can deliver a message anywhere worth calling sent. */
export function smsAvailable(): boolean {
  return twilioSender.info().available || logOnlyEnabled();
}

export * from "./types";
export { twilioSender, consoleSender };
