# Review instructions

A recipe box, weekly planner and shopping list for a handful of households.
Small, personal, and cheap to fix - but it holds other families' data and it
sends text messages, so those two things are where care belongs.

## What Important means here

Reserve 🔴 Important for findings that would break behaviour, expose one
household's data to another, or reach production without a way back:

- A recipe read that does not go through `src/lib/recipe-visibility.ts`, or a
  query that drops the household scope. This is the isolation guarantee, and it
  is the only thing in the app that a bug turns into a privacy incident.
- An action that takes an id from a form post and checks that the row _exists_
  rather than that the caller may _see_ it. The response then tells somebody a
  private recipe is there.
- A function crossing from a server component into MUI's client code -
  `component={Link}`, an `sx` callback, an `onChange` passed down. It
  typechecks, builds, serves 200 and dies at hydration, so no other check in
  this repo catches it.
- A migration that is not backward compatible, or a backfill that contradicts
  what existing rows meant.
- A phone number, email, token or recipe title written to a log.

Style, naming, refactors and test coverage are 🟡 Nit at most, however strongly
you feel about them.

## Always check

- Every new query that reads recipes takes a `householdId` and applies
  `visibleRecipes`. Search applies it twice - once as a Prisma filter, once in
  the raw SQL that does the ranking - and missing the second is the easy one.
- The week's shopping list is assembled only by `buildShoppingList` in
  `src/lib/week-list.ts`. Three callers need it and they have silently
  disagreed before.
- Nobody writes another person's row. `saveOwnPhone` is the pattern.
- A schema change has a migration, and an enum addition is `ALTER TYPE ... ADD
VALUE` rather than a table rewrite.
- A change to `src/lib/legal.ts` is flagged for a human. Carrier vetting
  pattern-matches that wording and has rejected this app twice over phrasing.

## Do not report

- Anything CI already enforces: Prettier formatting, ESLint, TypeScript errors.
  All three run on every push and a finding about them is noise.
- `src/generated/` - the Prisma client, not written by hand.
- The `nextjs-agent-rules` block in `CLAUDE.md` and `AGENTS.md`, which the
  Next.js dev server rewrites on every run.
- Missing tests as Important. Say it as a Nit if it matters.
- Suggestions to add abstraction for a second case that does not exist yet.
  This codebase deliberately does not buy permissions it has not needed.

## Verification bar

A claim about behaviour needs a `file:line` citation in the source, not an
inference from a name. Several things here read as if they do something other
than what they do - `PLANNED_SLOT` is one meal a day, `SHOPPING_SLOTS` is two,
and `delivered` in the SMS result means Twilio accepted it rather than that
anybody received it. Check before flagging.

## Re-review

After the first review of a pull request, post Important findings only.
Suppress new nits. A one-line fix reaching round seven on style is worse than
the style.

## Summary

Open the review body with a one-line tally, such as `1 important, 3 nits`, and
lead with "no blocking issues" when that is true. Cap nits at five per review;
if there are more, say "plus N similar" rather than posting them.
