/**
 * Decide whether this deployment may migrate the database it is pointed at.
 *
 * A preview deployment sharing the production database is the trap this
 * exists for, and it is not hypothetical: a preview applied a migration to
 * production twenty-two minutes before the pull request merged, in the form
 * the migration had at that moment. The migration was rewritten before it
 * landed, and Prisma records a migration by name - so the corrected version
 * never ran, and production carried a schema no commit in the repository
 * described. What it cost was a column, an invite that would not save, and
 * most of a morning.
 *
 * So the rule is about the database, not the branch: a deployment migrates
 * only what it is allowed to break. Production migrates its own database,
 * because that is the whole point of deploying. A preview migrates only when
 * it has been told its database is disposable.
 */

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// `||` rather than `??`: an empty string is how a shell passes "not set", and
// it should mean local, not an environment with no name.
const env = process.env.VERCEL_ENV || "local";

/**
 * Set to "true" on preview environments only once previews have a database of
 * their own - a Neon branch from the Vercel integration, say. It is a variable
 * rather than a code change so that turning it on is a settings change, made
 * in the same place the database itself is configured, by whoever knows which
 * database previews are actually pointed at.
 */
const disposable = process.env.PREVIEW_DATABASE_IS_DISPOSABLE === "true";

const allowed = env === "production" || env === "local" || disposable;

if (!allowed) {
  console.log(
    `[migrate] Skipped: this is a ${env} deployment, and anything other ` +
      `than production is assumed to share the production database until ` +
      `PREVIEW_DATABASE_IS_DISPOSABLE is set to "true". The build continues ` +
      `against whatever schema that database already has.`,
  );
  process.exit(0);
}

console.log(`[migrate] Running migrations for the ${env} environment.`);

// Resolved rather than looked up on PATH. This runs as an npm script, where
// node_modules/.bin is on PATH, but it is also the kind of thing someone runs
// directly to see what it would do - and "prisma: not found" exiting 127 looks
// close enough to a failed migration to waste an afternoon.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prisma = join(root, "node_modules", ".bin", "prisma");

const result = spawnSync(prisma, ["migrate", "deploy"], { stdio: "inherit" });

// A failed migration must fail the build. Deploying code that expects a column
// the database does not have is the failure this whole script is about.
process.exit(result.status ?? 1);
