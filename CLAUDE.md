<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

`README.md` is the long form, and its **Notes and limitations** section carries
what this file should point at rather than copy: how recipe visibility works and
the three things that follow from it, why the SMS consent machinery looks the
way it does, what the upload quota is for, and what has never been verified.
Read it before proposing work on sharing, admin access, or texting.

### Traps that have actually cost time here

- **Recipe visibility lives in one file.** `src/lib/recipe-visibility.ts` is
  the only place that decides who may read a recipe, and search needs it twice
  - once as a Prisma filter, once as SQL. A new read that does not go through
    it is how another family's dinner gets shown.

- **A function cannot cross from a server component into MUI's client code.**
  `component={Link}`, an `sx` callback, an `onChange` handed down from a server
  page: each one typechecks, builds cleanly and serves `200`, then dies at
  hydration. A green `npm run build` proves nothing about this — open the page
  in a browser before believing it works.
- **Restart the dev server after a schema change.** `src/lib/db.ts` caches the
  Prisma client on `globalThis` and that cache survives HMR. The symptom is
  `Cannot read properties of undefined (reading 'findMany')` on a model plainly
  in the schema, while `npm test` and `npm run typecheck` pass.
- **The legal wording is load-bearing.** It lives in `src/lib/legal.ts` so the
  consent checkbox, the public pages and the A2P campaign submission cannot
  drift apart, and carrier vetting pattern-matches phrasing rather than reading
  it. Two rejections are written up in the README. Don't reword it casually.
- **Nobody types anybody else's phone number.** `saveOwnPhone` writes the
  caller's own row and nothing else.

### Branches

One branch per change, named for what the change does:
`claude/<kebab-case-description>` - `claude/sms-consent`, `claude/heic-upload`,
`claude/upload-rate-limit`. Never reuse a branch for unrelated work, and never
reuse one whose pull request has already merged; start a fresh one off `main`.

### Before pushing

`npm run typecheck`, `npm test`, `npm run format:check`. The tests share one
database and empty it, so don't point them at anything you care about.
