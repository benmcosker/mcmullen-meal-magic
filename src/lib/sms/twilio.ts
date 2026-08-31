import type { SmsSender, SmsSenderInfo } from "./types";

/**
 * Twilio's code for "attempt to send to unsubscribed recipient".
 *
 * Twilio answers STOP itself, at its own edge, and never tells the
 * application - so this rejection is the only way the app finds out somebody
 * has opted out.
 */
export const TWILIO_UNSUBSCRIBED = 21610;

/**
 * Twilio, over its REST API directly.
 *
 * No SDK: sending one message is a form-encoded POST to one URL, and the
 * official package pulls a large dependency tree onto a serverless function to
 * wrap it. If this ever needs more of Twilio than "send a message", that trade
 * is worth revisiting.
 */

const API = "https://api.twilio.com/2010-04-01";

function credentials() {
  return {
    sid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? "",
    token: process.env.TWILIO_AUTH_TOKEN?.trim() ?? "",
    from: process.env.TWILIO_FROM_NUMBER?.trim() ?? "",
  };
}

export const twilioSender: SmsSender = {
  info(): SmsSenderInfo {
    const { sid, token, from } = credentials();
    const missing = [
      !sid && "TWILIO_ACCOUNT_SID",
      !token && "TWILIO_AUTH_TOKEN",
      !from && "TWILIO_FROM_NUMBER",
    ].filter(Boolean);

    return {
      id: "twilio",
      label: "Twilio",
      available: missing.length === 0,
      ...(missing.length > 0
        ? { unavailableReason: `Not configured: ${missing.join(", ")}.` }
        : {}),
    };
  },

  async send(to, body) {
    const { sid, token, from } = credentials();
    if (!sid || !token || !from) {
      return { ok: false, error: "Twilio is not configured." };
    }

    try {
      const response = await fetch(`${API}/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });

      if (response.ok) return { ok: true };

      // Twilio's own message is the useful part - "unverified number on a trial
      // account", "not a mobile number" - and it names no secret, so it is worth
      // passing through rather than flattening to "failed".
      const failure: { message?: string; code?: number } | null = await response
        .json()
        .then((json) => json as { message?: string; code?: number })
        .catch(() => null);

      return {
        ok: false,
        error:
          failure?.message ??
          `Twilio refused the message (${response.status}).`,
        ...(typeof failure?.code === "number" ? { code: failure.code } : {}),
      };
    } catch (error) {
      // A network failure reaching Twilio, which is not the same as Twilio
      // refusing: worth saying so, since one is worth retrying and one is not.
      return {
        ok: false,
        error: `Could not reach Twilio: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
