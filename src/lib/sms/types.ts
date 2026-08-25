/**
 * How a message gets sent, and what is known when it does not.
 *
 * Shaped after src/lib/shopping: an adapter that can describe its own
 * availability, so a feature with no credentials is absent from the UI rather
 * than present and broken.
 */

export type SmsRecipient = {
  /** E.164. */
  phone: string;
  /** Who it belongs to, for reporting a partial failure usefully. */
  name: string;
};

export type SendOutcome =
  | { ok: true; recipient: SmsRecipient; parts: number }
  | { ok: false; recipient: SmsRecipient; error: string };

export type SmsSenderInfo = {
  id: string;
  label: string;
  /** False when the sender has not been given what it needs to send. */
  available: boolean;
  /** Why not, when it is not. Shown to whoever can do something about it. */
  unavailableReason?: string;
};

export type SmsSender = {
  info(): SmsSenderInfo;
  /**
   * Send one already-split part to one number.
   *
   * Splitting belongs to the caller rather than the adapter: how a shopping
   * list is divided is a question about shopping lists, and every adapter
   * would otherwise have to answer it identically.
   */
  send(
    to: string,
    body: string,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
};
