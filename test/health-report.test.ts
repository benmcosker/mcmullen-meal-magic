import { describe, expect, it } from "vitest";

import {
  bump,
  buildReport,
  needsAttention,
  summariseAudit,
  summariseOutdated,
  // Plain JS, so the workflow can run it straight after npm ci.
} from "../scripts/health-report.mjs";

const advisory = (over = {}) => ({
  severity: "high",
  isDirect: false,
  fixAvailable: true,
  ...over,
});

describe("bump", () => {
  it("tells a project apart from a chore", () => {
    expect(bump("1.2.3", "2.0.0")).toBe("major");
    expect(bump("1.2.3", "1.3.0")).toBe("minor");
    expect(bump("1.2.3", "1.2.4")).toBe("patch");
  });

  it("has nothing to say when nothing moved", () => {
    expect(bump("1.2.3", "1.2.3")).toBeNull();
    expect(bump(undefined, "1.2.3")).toBeNull();
  });

  it("copes with a leading range character", () => {
    // npm reports "current" bare but a package.json range is "^1.2.3".
    expect(bump("^1.2.3", "2.0.0")).toBe("major");
  });
});

describe("summariseAudit", () => {
  const audit = {
    vulnerabilities: {
      next: advisory({ severity: "critical", isDirect: true }),
      eslint: advisory({ severity: "high" }),
      chalk: advisory({ severity: "low" }),
    },
  };

  it("reports moderate and above, and leaves the noise out", () => {
    const summary = summariseAudit(audit, { vulnerabilities: {} });
    expect(summary.total).toBe(3);
    expect(summary.reportable.map((a: { name: string }) => a.name)).toEqual([
      "next",
      "eslint",
    ]);
  });

  /*
   * The number that decides whether a Monday matters. Reaching a dev-only
   * advisory means running the toolchain; reaching a production one means
   * sending a request, and those deserve different urgency.
   */
  it("counts separately what a request could reach", () => {
    const summary = summariseAudit(audit, {
      vulnerabilities: { next: advisory({ severity: "critical" }) },
    });
    expect(summary.production.map((a: { name: string }) => a.name)).toEqual([
      "next",
    ]);
  });

  it("marks a fix that is itself a major, because that is not a Tuesday job", () => {
    const summary = summariseAudit(
      {
        vulnerabilities: {
          prisma: advisory({ fixAvailable: { isSemVerMajor: true } }),
        },
      },
      {},
    );
    expect(summary.reportable[0].breaking).toBe(true);
  });

  it("says when there is no fix to apply yet", () => {
    const summary = summariseAudit(
      { vulnerabilities: { sharp: advisory({ fixAvailable: false }) } },
      {},
    );
    expect(summary.reportable[0].fixable).toBe(false);
  });

  it("survives npm saying nothing at all", () => {
    expect(summariseAudit({}, {}).total).toBe(0);
    expect(summariseAudit(undefined, undefined).reportable).toEqual([]);
  });
});

describe("needsAttention", () => {
  const clear = {
    audit: { reportable: [], production: [], total: 0 },
    outdated: { major: [], minor: [], patch: [] },
    drift: false,
  };

  it("stays quiet when there is nothing to do", () => {
    expect(needsAttention(clear)).toBe(false);
  });

  /*
   * Patches alone are not worth an issue. They arrive constantly, npm audit
   * speaks up when one of them matters, and a weekly notice nobody needs to
   * act on is how people learn to skip the notice that does matter.
   */
  it("does not wake anybody for patch releases alone", () => {
    expect(
      needsAttention({
        ...clear,
        outdated: { major: [], minor: [], patch: [{}, {}] },
      }),
    ).toBe(false);
  });

  it("speaks up for drift, advisories or a real version gap", () => {
    expect(needsAttention({ ...clear, drift: true })).toBe(true);
    expect(
      needsAttention({ ...clear, audit: { ...clear.audit, reportable: [{}] } }),
    ).toBe(true);
    expect(
      needsAttention({
        ...clear,
        outdated: { major: [{}], minor: [], patch: [] },
      }),
    ).toBe(true);
  });
});

describe("buildReport", () => {
  const report = {
    audit: summariseAudit(
      {
        vulnerabilities: {
          next: advisory({ severity: "critical", isDirect: true }),
        },
      },
      { vulnerabilities: { next: advisory() } },
    ),
    outdated: summariseOutdated({
      typescript: { current: "5.9.3", latest: "7.0.2" },
      zod: { current: "4.4.3", latest: "4.5.4" },
    }),
    drift: true,
    versions: { node: "v22.22.2" },
    date: "2026-09-09",
  };

  it("names the advisory, the majors and the drift", () => {
    const body = buildReport(report);
    expect(body).toContain("**next** - critical, direct dependency");
    expect(body).toContain("**typescript** 5.9.3 → 7.0.2");
    expect(body).toContain("- zod 4.4.3 → 4.5.4");
    expect(body).toContain("**Drift**");
  });

  it("says so plainly when the schema is fine", () => {
    expect(buildReport({ ...report, drift: false })).toContain(
      "Migrations match the schema",
    );
  });

  it("writes _None._ rather than an empty heading", () => {
    const empty = {
      ...report,
      audit: summariseAudit({}, {}),
      outdated: summariseOutdated({}),
    };
    expect(buildReport(empty)).toContain("_None._");
  });
});
