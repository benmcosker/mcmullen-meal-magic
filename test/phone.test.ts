import { describe, expect, it } from "vitest";

import { formatPhone, parsePhone } from "@/lib/phone";

const e164 = (input: string) => {
  const result = parsePhone(input);
  return result.ok ? result.e164 : `REJECTED: ${result.reason}`;
};

describe("parsePhone", () => {
  it.each([
    ["5551234567", "+15551234567"],
    ["555 123 4567", "+15551234567"],
    ["(555) 123-4567", "+15551234567"],
    ["555.123.4567", "+15551234567"],
    ["15551234567", "+15551234567"],
    ["+1 555 123 4567", "+15551234567"],
    ["  +15551234567  ", "+15551234567"],
  ])("normalises %j to %j", (input, expected) => {
    expect(e164(input)).toBe(expected);
  });

  it("treats 00 as a plus, the way most of the world writes it", () => {
    expect(e164("00447700900123")).toBe("+447700900123");
  });

  it("believes an explicit country code rather than assuming its own", () => {
    // The trap: a UK number is eleven digits and would otherwise be read as
    // North American with the country code left off.
    expect(e164("+447700900123")).toBe("+447700900123");
  });

  it("assumes the household's country only for a bare national number", () => {
    expect(e164("5551234567")).toBe("+15551234567");
  });

  it.each([
    ["", "Enter a phone number."],
    ["   ", "Enter a phone number."],
    ["---", "That has no digits in it."],
    ["555-EAT-FOOD", "Use digits rather than letters."],
    ["12345", "That number looks too short."],
    ["+1234567890123456789", "That number looks too long."],
  ])("refuses %j", (input, reason) => {
    expect(e164(input)).toBe(`REJECTED: ${reason}`);
  });

  it("refuses a leading zero rather than guessing a country", () => {
    // "07700 900123" is a British number written domestically. Prefixing the
    // household's country code would produce a real but wrong number, and the
    // shopping list would go to a stranger.
    expect(e164("07700900123")).toBe(
      "REJECTED: Start with a country code, or a plus.",
    );
  });

  it("is idempotent, so re-saving a stored number does not corrupt it", () => {
    const once = e164("(555) 123-4567");
    expect(e164(once)).toBe(once);
  });
});

describe("formatPhone", () => {
  it("groups a North American number the way it is written", () => {
    expect(formatPhone("+15551234567")).toBe("(555) 123-4567");
  });

  it("leaves a number of unknown shape alone", () => {
    // Inventing grouping for a format nobody here knows makes it harder to
    // read, not easier.
    expect(formatPhone("+447700900123")).toBe("+447700900123");
  });
});
