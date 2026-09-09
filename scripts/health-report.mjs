/**
 * Turning a week of rot into something worth reading.
 *
 * CI already runs on every push, so it answers "did this commit break
 * anything". Nothing in it answers "did the world move while we were not
 * looking" - a CVE published against a dependency nobody touched, a package
 * three majors behind, a schema that drifted from its migrations. That is what
 * this summarises.
 *
 * Plain JS with no dependencies so the workflow can run it straight after
 * `npm ci` without a build step, and exported rather than inlined so the
 * judgement calls below are testable.
 */

/** Severities worth waking somebody for, worst first. */
export const REPORTABLE = ["critical", "high", "moderate"];

/**
 * Advisories, split by whether they can reach production.
 *
 * `prod` comes from a second `npm audit --omit=dev` rather than from guessing
 * at the tree: reaching a dev-only advisory means running the toolchain rather
 * than sending a request, and "8 advisories" and "1 a stranger could reach"
 * are different sentences deserving different Mondays. Guessing which was
 * which from the node paths was the first version of this, and it was wrong
 * often enough not to keep.
 */
export function summariseAudit(audit, prodAudit) {
  const entries = Object.entries(audit?.vulnerabilities ?? {});
  const inProd = new Set(Object.keys(prodAudit?.vulnerabilities ?? {}));

  const advisories = entries.map(([name, v]) => ({
    name,
    severity: v.severity,
    direct: Boolean(v.isDirect),
    // npm reports `true`, `false`, or an object describing the fix.
    fixable: v.fixAvailable !== false,
    // A fix that changes a major is not a fix you apply on a Tuesday.
    breaking: Boolean(v.fixAvailable?.isSemVerMajor),
    prod: inProd.has(name),
  }));

  const reportable = advisories.filter((a) => REPORTABLE.includes(a.severity));
  return {
    total: entries.length,
    reportable,
    production: reportable.filter((a) => a.prod),
    counts: audit?.metadata?.vulnerabilities ?? {},
  };
}

/** Which part of the version moved. A major is a project; a patch is a chore. */
export function bump(current, latest) {
  if (!current || !latest || current === latest) return null;
  const [a, b] = [current, latest].map((v) =>
    String(v)
      .replace(/^[^0-9]*/, "")
      .split(".")
      .map(Number),
  );
  if (a[0] !== b[0]) return "major";
  if (a[1] !== b[1]) return "minor";
  return "patch";
}

/**
 * What is behind, grouped by how much work catching up is.
 *
 * Majors are listed and never counted as routine: this is the number that
 * quietly grows on an app nobody is maintaining, and the whole point of asking
 * weekly is to see it move from two to three rather than to discover it at
 * eleven.
 */
export function summariseOutdated(outdated) {
  const rows = Object.entries(outdated ?? {}).map(([name, o]) => ({
    name,
    current: o.current,
    latest: o.latest,
    kind: bump(o.current, o.latest),
  }));

  return {
    major: rows.filter((r) => r.kind === "major"),
    minor: rows.filter((r) => r.kind === "minor"),
    patch: rows.filter((r) => r.kind === "patch"),
  };
}

/** Whole days from `from` to `to`, negative once `to` is in the past. */
export function daysUntil(to, from) {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / day);
}

/**
 * How long each runtime has left.
 *
 * The dates are fetched rather than written down: a support date copied into a
 * repo is wrong the first time upstream moves it, and nobody re-reads a
 * constant. A lookup that failed is reported as a failure rather than as
 * "fine" - not knowing and being safe are different, and only one of them is
 * worth silence.
 */
export function summariseRuntimes(runtimes, eol, today, warnWithinDays) {
  return runtimes.map((r) => {
    const found = eol?.[`${r.product}/${r.cycle}`];

    if (found === undefined) {
      return { ...r, state: "unknown" };
    }
    // endoflife.date answers `false` for a cycle with no announced end.
    if (!found.eol) {
      return { ...r, state: "supported", eol: null };
    }

    const days = daysUntil(found.eol, today);
    return {
      ...r,
      eol: found.eol,
      days,
      state: days < 0 ? "ended" : days <= warnWithinDays ? "soon" : "supported",
    };
  });
}

/**
 * How old each secret is.
 *
 * "never recorded" is a real answer and is reported, but it does not raise the
 * alarm on its own: a weekly notice about a form nobody has filled in is how
 * somebody learns to skip the notice that matters. An overdue rotation does
 * raise it, because that is a fact about the world rather than about the file.
 */
export function summariseCredentials(credentials, today) {
  return credentials.map((c) => {
    if (!c.rotatedOn) return { ...c, state: "unrecorded" };

    const age = -daysUntil(c.rotatedOn, today);
    return {
      ...c,
      age,
      state: age > c.everyDays ? "overdue" : "current",
    };
  });
}

/**
 * Is there anything here a person should act on?
 *
 * @param {{
 *   audit: { reportable: unknown[], [k: string]: unknown },
 *   outdated: { major: unknown[], minor: unknown[], [k: string]: unknown },
 *   drift: boolean,
 *   runtimes?: { state: string }[],
 *   credentials?: { state: string }[],
 * }} report
 */
export function needsAttention({
  audit,
  outdated,
  drift,
  runtimes = [],
  credentials = [],
}) {
  return (
    drift ||
    audit.reportable.length > 0 ||
    outdated.major.length > 0 ||
    outdated.minor.length > 0 ||
    // A runtime we could not look up counts: not knowing is not the same as
    // being fine, and a lookup that quietly fails every week is worthless.
    runtimes.some((r) => ["ended", "soon", "unknown"].includes(r.state)) ||
    credentials.some((c) => c.state === "overdue")
  );
}

const list = (rows, render) =>
  rows.length ? rows.map(render).join("\n") : "_None._";

/**
 * The issue body.
 *
 * Written to be skimmed in ten seconds by somebody who has not thought about
 * this app all week: what changed, what it would cost to fix, and what can be
 * ignored until next time.
 */
export function buildReport({
  audit,
  outdated,
  drift,
  versions,
  date,
  runtimes = [],
  credentials = [],
}) {
  const runtimeLines = list(runtimes, (r) => {
    const what = `**${r.product} ${r.cycle}** (${r.used})`;
    if (r.state === "unknown") {
      return `- ${what} - **could not look this up**. endoflife.date did not answer, so this week says nothing about it either way.`;
    }
    if (r.state === "ended") {
      return `- ${what} - **out of support since ${r.eol}**, ${-r.days} days ago.`;
    }
    if (r.state === "soon") {
      return `- ${what} - support ends ${r.eol}, in ${r.days} days.`;
    }
    return `- ${what} - supported${r.eol ? ` until ${r.eol}` : ", no end announced"}.`;
  });

  const credentialLines = list(credentials, (c) => {
    const what = `**${c.name}** (${c.where})`;
    const note = c.note ? ` ${c.note}` : "";
    if (c.state === "unrecorded") {
      return `- ${what} - no rotation date recorded.${note}`;
    }
    if (c.state === "overdue") {
      return `- ${what} - **${c.age} days old**, past the ${c.everyDays}-day mark.${note}`;
    }
    return `- ${what} - ${c.age} days old.${note}`;
  });

  const advisories = list(
    audit.reportable,
    (a) =>
      `- **${a.name}** - ${a.severity}${a.direct ? ", direct dependency" : ""}` +
      (a.prod ? ", ships to production" : ", build-time only") +
      (a.fixable
        ? a.breaking
          ? " · fix available, but it is a major"
          : " · fix available"
        : " · no fix published yet"),
  );

  const majors = list(
    outdated.major,
    (r) => `- **${r.name}** ${r.current} → ${r.latest}`,
  );
  const minors = list(
    outdated.minor,
    (r) => `- ${r.name} ${r.current} → ${r.latest}`,
  );

  return `_Checked ${date}._ CI covers what a commit breaks; this covers what
time breaks.

## Advisories

${audit.total} in the tree, ${audit.reportable.length} at moderate or above, ${audit.production.length} of those reachable from a request.

${advisories}

## Behind

${outdated.major.length} major, ${outdated.minor.length} minor, ${outdated.patch.length} patch.

### Majors

${majors}

### Minors

${minors}

## Schema

${drift ? "**Drift**: `prisma/schema.prisma` and the migrations disagree. A migration is missing." : "Migrations match the schema."}

## Runtimes

${runtimeLines}

## Credentials

${credentialLines}

<sub>Rotation dates are kept by hand in \`lifecycle.json\` - no API can say when
somebody last rotated a token. A missing date is reported but never opens this
issue on its own.</sub>

## Versions

${Object.entries(versions)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

<sub>Patches are left off this list on purpose - they are noise, and \`npm audit\`
already speaks up when one of them matters.</sub>`;
}
