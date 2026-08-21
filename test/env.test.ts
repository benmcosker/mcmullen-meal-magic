import { describe, expect, it } from "vitest";

import { checkEnv, formatMissingRequired } from "@/lib/env";

const full = {
  DATABASE_URL: "postgresql://localhost/db",
  BETTER_AUTH_SECRET: "secret",
  ANTHROPIC_API_KEY: "k",
  INSTACART_API_KEY: "k",
  BLOB_READ_WRITE_TOKEN: "k",
};

describe("checkEnv", () => {
  it("is satisfied when everything is set", () => {
    const report = checkEnv(full);
    expect(report.missingRequired).toEqual([]);
    expect(report.disabledFeatures).toEqual([]);
  });

  it("names every missing required variable, not just the first", () => {
    expect(checkEnv({}).missingRequired).toEqual([
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
    ]);
  });

  it("treats a blank value as missing", () => {
    // An env var set to "" in a dashboard is a common way to half-configure
    // something, and it fails later in a much less obvious place.
    expect(checkEnv({ ...full, DATABASE_URL: "   " }).missingRequired).toEqual([
      "DATABASE_URL",
    ]);
  });

  it("does not treat optional keys as required", () => {
    const report = checkEnv({
      DATABASE_URL: "x",
      BETTER_AUTH_SECRET: "y",
    });
    expect(report.missingRequired).toEqual([]);
    expect(report.disabledFeatures.map((f) => f.missing)).toEqual([
      "ANTHROPIC_API_KEY",
      "INSTACART_API_KEY",
      "BLOB_READ_WRITE_TOKEN",
    ]);
  });

  it("says what each missing optional key actually costs", () => {
    const blob = checkEnv({ ...full, BLOB_READ_WRITE_TOKEN: "" })
      .disabledFeatures[0];
    expect(blob.feature).toBe("Cloud file storage");
    expect(blob.consequence).toMatch(/vanish between deploys/);
  });
});

describe("formatMissingRequired", () => {
  it("lists each variable and points at where values come from", () => {
    const message = formatMissingRequired([
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
    ]);
    expect(message).toContain("2 required environment variables missing");
    expect(message).toContain("- DATABASE_URL");
    expect(message).toContain("- BETTER_AUTH_SECRET");
    expect(message).toContain(".env.example");
  });

  it("gets the singular right for one missing variable", () => {
    expect(formatMissingRequired(["DATABASE_URL"])).toContain(
      "1 required environment variable missing",
    );
  });
});
