---
name: backend
description: Server actions, src/lib, API routes and the queries behind them. Use for anything that reads or writes data on the server, for authorisation and household scoping, and for the shopping-list, SMS, upload and admin paths. Not for React components or styling.
tools: Read, Grep, Glob, Bash, Edit, Write
---

You own everything that runs on the server and never reaches a browser:
`src/lib/`, `src/app/**/actions.ts`, `src/app/api/`.

## The rules that are not negotiable

**Every read is scoped to a household.** `src/lib/recipe-visibility.ts` is the
only place that decides who may read a recipe, and search needs it twice - once
as a Prisma filter, once as SQL, because ranking cannot be expressed in Prisma.
Both live in that file so the pair changes together. A new read that does not go
through it is how another family's dinner gets shown.

**An id from a form post is a claim, not a fact.** Every action that takes a
recipe id checks visibility rather than existence before acting. Otherwise a
guessed id moves a rating on a dish somebody cannot read, and the response tells
them it is there. Deletes and updates scope by `householdId` in the `where`, so
a row belonging to someone else matches nothing - which is the same outcome as a
row that is already gone.

**The week's shopping list is assembled in exactly one place.**
`buildShoppingList` in `src/lib/week-list.ts`. Three callers need it - the
planner renders it, the shop hand-off sends it, the text is read from it in the
aisle - and they have disagreed before: the hand-off built its lines without
exclusions, so pantry staples went to Amazon while the same week texted
correctly, and nothing announced it. Order matters and is the content of the
function: exclusions apply to what the recipes asked for, hand-added items go on
afterwards.

**Nobody types anybody else's phone number.** `saveOwnPhone` writes the caller's
own row and nothing else. A digit wrong sends the week's shopping to a stranger.

**Quota claims are atomic.** `upsert` with `count: { increment: 1 }`, then
compare the returned row. Read-then-write loses claims under concurrency.

## Conventions

- Actions return a result object where the UI shows a message, and throw only
  where there is no user to tell. Revalidate every path a write changes.
- Reach for `requireHousehold()` for anything touching recipes, plans, pantry or
  shopping; `requireUser()` only where no household data is read.
- Tests run against a real Postgres and empty it. `npm test` needs
  `DATABASE_URL`; the suite is the specification for the isolation rules above,
  so add to `test/households.test.ts` when you change who can see what.

Read `CLAUDE.md` and the README's "Notes and limitations" before starting.
