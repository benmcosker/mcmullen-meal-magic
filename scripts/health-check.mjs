/**
 * The workflow's entry point: read what the tools produced, write the report.
 *
 * Split from health-report.mjs so the judgement calls in there can be tested
 * without a filesystem, and so this file stays a matter of plumbing.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { createRequire } from "node:module";

import {
  buildReport,
  needsAttention,
  summariseAudit,
  summariseOutdated,
} from "./health-report.mjs";

/** npm writes nothing when it has nothing to say, and that is not an error. */
function readJson(path) {
  try {
    const text = readFileSync(path, "utf8").trim();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const audit = summariseAudit(
  readJson("/tmp/audit.json"),
  readJson("/tmp/audit-prod.json"),
);
const outdated = summariseOutdated(readJson("/tmp/outdated.json"));
const drift = process.env.DRIFT === "true";

const report = {
  audit,
  outdated,
  drift,
  versions: {
    node: process.version,
    next: pkg.dependencies?.next ?? "unknown",
    prisma:
      pkg.devDependencies?.prisma ?? pkg.dependencies?.prisma ?? "unknown",
  },
  date: new Date().toISOString().slice(0, 10),
};

const needed = needsAttention(report);
const body = buildReport(report);

// Multi-line values need a delimiter GitHub will not find in the content.
const out = process.env.GITHUB_OUTPUT;
if (out) {
  const eof = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(out, `needed=${needed}\n`);
  appendFileSync(out, `body<<${eof}\n${body}\n${eof}\n`);
}

console.log(needed ? body : "Nothing to report.");
