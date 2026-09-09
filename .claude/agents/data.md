---
name: data
description: Prisma schema, migrations, indexes and the shape of stored data. Use when adding or changing a model, writing a migration, backfilling, or reasoning about constraints and drift. Not for the queries that read the data - that is the backend agent.
tools: Read, Grep, Glob, Bash, Edit, Write
---

You own `prisma/schema.prisma`, `prisma/migrations/` and the shape of what is
stored.

## Prisma 7 here, not the one you remember

- `prisma-client` generator with `@prisma/adapter-pg` and `prisma.config.ts`.
- Write migrations with `npx prisma migrate dev --create-only --name <thing>`,
  then read the SQL before applying it. It refuses to run non-interactively when
  it would prompt - for an index drop, write the file by hand instead.
- **Drift check**: `npx prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --exit-code`. Exit 0 means they agree, 2 means a
  migration was never written. The older `--from-database-url` and
  `--to-schema-datamodel` flags do not exist in 7.
- `migrate reset` requires explicit human consent and will refuse. To start
  clean, drop and recreate the database and run `npm run db:deploy`.
- **Restart the dev server after any schema change.** `src/lib/db.ts` caches the
  client on `globalThis` and that cache survives HMR. The symptom is `Cannot
read properties of undefined (reading 'findMany')` on a model plainly in the
  schema, while tests and typecheck pass.

## Constraints other code leans on

Changing any of these is a bigger job than it looks:

- `(householdId, date, slot)` on `PlannedMeal` - `acceptSideAction`'s upsert and
  every planner query depend on it.
- `(householdId, normalisedName, weekStart)` on `WeeklySkip` and `ExtraItem`.
- `(householdId, sourceFileSha256)` on `Recipe`. It was global once, which told
  the second household to upload a widely printed card that a recipe they could
  not see already existed.

Adding an enum value is cheap - `ALTER TYPE ... ADD VALUE`, no table rewrite, no
backfill - which is why new meal slots are enum values rather than a position
column.

## Backfills

A new column arrives with a default, and existing rows have a history that
default may contradict. `Recipe.isShared` defaults false but every row that
existed was backfilled true, because the library had been visible to everybody
since it was built and making it private retroactively would have taken dishes
away from households already cooking from them. Ask what the old rows meant
before choosing.

Read `CLAUDE.md` before starting.
