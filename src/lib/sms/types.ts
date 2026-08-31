/**
 * How a message gets sent, and what is known when it does not.
 *
 * Shaped after src/lib/shopping: an adapter that can describe its own
 * availability, so a feature with no credentials is absent from the UI rather
 * than present and broken.
 */

export type SmsRecipient = {
  /** Whose account this is, so a withdrawal can be written back against it. */
  id: string;
  /** E.164. */
  phone: string;
  /** Who it belongs to, for reporting a partial failure usefully. */
  name: string;
};

export type SendOutcome =
  | { ok: true; recipient: SmsRecipient; parts: number }
  | {
      ok: false;
      recipient: SmsRecipient;
      error: string;
      /** True when the failure was this person having replied STOP. */
      unsubscribed?: boolean;
    };

export type SmsSenderInfo = {
  id: string;
  label: string;
  /** False when the sender has not been given what it needs to send. */
  available: boolean;
  /** Why not, when it is not. Shown to whoever can do something about it. */
  unavailableReason?: string;
};

export type SmsSendResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      /**
       * The provider's own code for the failure, where it has one.
       *
       * Carried rather than folded into the message because one of these has
       * to be acted on: a recipient who has replied STOP is not a transient
       * error to be retried next week, it is a person who has withdrawn, and
       * the app's own record needs to learn that.
       */
      code?: number;
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
  send(to: string, body: string): Promise<SmsSendResult>;
};
