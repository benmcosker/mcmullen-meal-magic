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
    url: process.env.DATABASE_URL ?? "",
  },
});
