<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

`README.md` is the long form, and two of its sections carry things this file
should point at rather than copy: **Not built yet** (the hybrid library and the
meta-level admin view, with the decisions each still needs before any schema is
written) and **Notes and limitations** (why the SMS consent machinery looks the
way it does, what the upload quota is for, and what has never been verified).
Read both before proposing work on sharing, admin access, or texting.

### Traps that have actually cost time here

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

### Before pushing

`npm run typecheck`, `npm test`, `npm run format:check`. The tests share one
database and empty it, so don't point them at anything you care about.
