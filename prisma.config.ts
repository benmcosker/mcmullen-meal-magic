import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 resolves the connection string here rather than in schema.prisma.
 * Relative SQLite-style paths would resolve against this file's directory.
 *
 * The URL is read straight from process.env rather than through prisma/config's
 * `env()` helper, which throws while the config file is being *loaded*. That
 * breaks commands which need no database at all: `prisma generate` runs from
 * postinstall, so `npm ci` fails on any checkout without a .env - a fresh clone
 * following the README, and CI before its environment is applied. Commands that
 * genuinely need the database still fail, just at the point of connecting and
 * with a message about the connection rather than about config loading.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations prefer a direct connection.
    //
    // Neon's pooled endpoint runs PgBouncer in transaction mode, which does not
    // support the session-level locks and prepared statements Prisma Migrate
    // relies on - migrations against it fail or hang. Neon exposes an unpooled
    // host for exactly this; put it in DIRECT_DATABASE_URL and the app keeps
    // using the pooled DATABASE_URL at runtime, where pooling is what you want.
    //
    // Only the CLI reads this file. The running app builds its own connection
    // from DATABASE_URL in src/lib/db.ts, so the two are independent by design.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "",
    // A scratch database Prisma resets to replay the migration history when it
    // needs to compare it against the schema. Only ever used by the CLI, and
    // only when it is set - production has no such database and needs none.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
