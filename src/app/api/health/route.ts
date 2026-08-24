import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { checkEnv } from "@/lib/env";

// Always run fresh: a cached health check answers for a past deploy.
export const dynamic = "force-dynamic";

/**
 * Is this deploy actually working?
 *
 * Deliberately does more than return 200: it runs a query, because the failure
 * this is meant to catch - a Postgres that is unreachable, or migrations that
 * never ran - looks identical to a healthy app until something touches the
 * database.
 *
 * Unauthenticated, so it can be checked before an account exists, and reports
 * only which optional features are configured, never any value.
 */
export async function GET() {
  const { disabledFeatures } = checkEnv();
  const startedAt = Date.now();

  try {
    // Proves the connection works and the schema is present. Counting a table
    // the app owns catches "connected, but migrations never ran", which a bare
    // SELECT 1 would sail straight past.
    const users = await prisma.user.count();

    // Whether this connection can write, asked without writing anything.
    //
    // Every page in the app is reads; the writes are invites, recipes, the
    // plan. A connection that reads but refuses to write therefore looks
    // completely healthy until somebody tries to save something, and then
    // fails in whatever place they happened to try. Both of these describe the
    // session the app itself is holding, which is the thing in question - a
    // console attached to some other endpoint cannot answer it.
    const [session] = await prisma.$queryRaw<
      { replica: boolean; readOnly: string }[]
    >`
      SELECT pg_is_in_recovery() AS replica,
             current_setting('default_transaction_read_only') AS "readOnly"
    `;
    const writable = !session.replica && session.readOnly !== "on";

    return NextResponse.json({
      status: writable ? "ok" : "read-only",
      database: {
        reachable: true,
        migrated: true,
        writable,
        // Named apart because the fixes differ: a replica is the wrong
        // endpoint in DATABASE_URL, while a primary in read-only mode is
        // usually the provider having put the project there - over a limit,
        // or mid-maintenance.
        ...(writable
          ? {}
          : { reason: session.replica ? "read replica" : "read-only mode" }),
        users,
      },
      queryMs: Date.now() - startedAt,
      ...(writable
        ? {}
        : {
            hint: session.replica
              ? "DATABASE_URL points at a read replica. Point it at the primary."
              : "The database is in read-only mode. Check the provider's console - a project over its limit is the usual cause.",
          }),
      disabledFeatures: disabledFeatures.map((f) => f.feature),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Two failures that need different fixes, and look the same from outside:
    // a database we cannot reach, and one we reached whose schema is missing
    // because `prisma migrate deploy` never ran. A missing relation proves the
    // connection worked, so it is the one signal that separates them.
    const schemaMissing =
      /relation .* does not exist|does not exist in the current database/i.test(
        message,
      );

    return NextResponse.json(
      {
        status: "error",
        database: { reachable: schemaMissing, migrated: false },
        hint: schemaMissing
          ? "Connected, but the schema is missing. Run `npm run db:deploy`."
          : "Could not reach the database. Check DATABASE_URL.",
        disabledFeatures: disabledFeatures.map((f) => f.feature),
      },
      { status: 503 },
    );
  }
}
