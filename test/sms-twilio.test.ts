import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TWILIO_UNSUBSCRIBED, twilioSender } from "@/lib/sms/twilio";

/**
 * The adapter, against Twilio's actual response shapes.
 *
 * Worth testing directly because everything above it depends on one detail: a
 * refusal carries a numeric `code`, and the shopping list acts on exactly one
 * of those values. If that field stops being read, a STOP reply silently goes
 * back to being invisible, and no test above this one would notice.
 */
describe("the Twilio adapter", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = "AC_test";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_NUMBER = "+15550000000";
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  const respond = (status: number, body: unknown) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      })),
    );

  it("reads the code off a refusal, so a STOP can be acted on", async () => {
    respond(400, {
      code: 21610,
      message: "Attempt to send to unsubscribed recipient",
    });

    const result = await twilioSender.send("+15551110000", "hello");

    expect(result).toEqual({
      ok: false,
      error: "Attempt to send to unsubscribed recipient",
      code: TWILIO_UNSUBSCRIBED,
    });
  });

  it("passes Twilio's own words through rather than flattening them", async () => {
    // "unverified number on a trial account" is the useful part, and it names
    // no secret.
    respond(400, { code: 21608, message: "The number is unverified" });

    const result = await twilioSender.send("+15551110000", "hello");
    expect(result).toEqual({
      ok: false,
      error: "The number is unverified",
      code: 21608,
    });
  });

  it("still says something when the body is not the shape expected", async () => {
    respond(500, "gateway exploded");

    const result = await twilioSender.send("+15551110000", "hello");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("500");
    expect(!result.ok && result.code).toBeUndefined();
  });

  it("reports a 2xx as sent, which is all a 2xx means", async () => {
    // Twilio returning 201 means it accepted the message for delivery, not
    // that a carrier delivered it. The adapter cannot know more than this.
    respond(201, { sid: "SM_test", status: "queued" });

    expect(await twilioSender.send("+15551110000", "hello")).toEqual({
      ok: true,
    });
  });

  it("refuses to send at all when it has no credentials", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await twilioSender.send("+15551110000", "hello");

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
