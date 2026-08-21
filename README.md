# Meal Magic

Recipe box, weekly meal planner and grocery list for the McMullen household.

> **Status: scaffold.** Tooling, database layer and CI are wired up. No
> features are built yet — the app renders a single placeholder screen.

## Stack

| Concern   | Choice                                        |
| --------- | --------------------------------------------- |
| Framework | Next.js 16 (App Router) + React 19            |
| Language  | TypeScript                                    |
| Styling   | Tailwind CSS 4                                |
| Database  | Prisma 7 → SQLite locally, Postgres-ready     |
| Tests     | Vitest                                        |
| Quality   | ESLint + Prettier, enforced in GitHub Actions |

## Getting started

```bash
npm install          # postinstall runs `prisma generate`
cp .env.example .env # sets DATABASE_URL to a local SQLite file
npm run db:migrate   # creates prisma/dev.db and applies migrations
npm run dev          # http://localhost:3000
```

## Scripts

| Script                 | Does                                           |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Dev server                                     |
| `npm run build`        | Production build                               |
| `npm start`            | Serve the production build                     |
| `npm test`             | Run the Vitest suite once                      |
| `npm run test:watch`   | Vitest in watch mode                           |
| `npm run lint`         | ESLint                                         |
| `npm run typecheck`    | `tsc --noEmit`                                 |
| `npm run format`       | Rewrite files with Prettier                    |
| `npm run format:check` | Fail if anything is unformatted (CI does this) |
| `npm run db:migrate`   | Create + apply a migration in dev              |
| `npm run db:deploy`    | Apply existing migrations (deploys)            |
| `npm run db:studio`    | Prisma Studio GUI                              |

## Data model

`prisma/schema.prisma` sketches four models — `Recipe`, `Ingredient`,
`PlannedMeal` and `GroceryItem` — covering the intended flow of recipes into a
weekly plan and out as a shopping list. They are a starting point, not a
settled design; nothing reads or writes them yet, so revising them is cheap.

Prisma 7 notes, since they differ from older tutorials:

- The connection string lives in `prisma.config.ts`, **not** in
  `schema.prisma`. SQLite paths there resolve relative to that config file.
- The generator is `prisma-client` (not `prisma-client-js`) and emits
  TypeScript into `src/generated/prisma`, which is gitignored and rebuilt by
  `postinstall`.
- A driver adapter is required. `src/lib/db.ts` uses
  `@prisma/adapter-better-sqlite3`.

### Moving to Postgres

Three changes: set `provider = "postgresql"` in `schema.prisma`, swap the
adapter in `src/lib/db.ts` for `@prisma/adapter-pg` (already published at the
same version), and point `DATABASE_URL` at the Postgres instance. The schema
itself is portable, except `PlannedMeal.slot`, which is a `String` because
SQLite has no native enums — worth promoting to a real enum on Postgres.

## Known issues

`npm audit` reports a high-severity advisory in `deepmerge-ts`, pulled in via
`@prisma/config` under the `prisma` CLI. It is a dev-only dependency and is not
reachable from application code at runtime. There is no fixed release upstream
yet; `npm audit fix --force` "resolves" it only by downgrading to Prisma 6,
which is a breaking change. Worth re-checking when Prisma next publishes.
