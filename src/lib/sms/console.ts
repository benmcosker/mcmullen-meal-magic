import type { SmsSender, SmsSenderInfo } from "./types";

/**
 * The sender used when no credentials exist: writes the message to the log and
 * reports success.
 *
 * This is for development, where the whole flow - who it goes to, how the list
 * splits, what the text reads like - is worth exercising without a Twilio
 * account or spending anything. It deliberately does *not* declare itself
 * available, so it can never stand in for the real one in production and leave
 * somebody believing a message was sent that was not.
 */
export const consoleSender: SmsSender = {
  info(): SmsSenderInfo {
    return {
      id: "console",
      label: "Log only (development)",
      available: false,
      unavailableReason:
        "No SMS provider is configured, so messages are only written to the " +
        "server log.",
    };
  },

  async send(to, body) {
    console.log(`[sms] to ${to}:\n${body}\n`);
    return { ok: true };
  },
};
