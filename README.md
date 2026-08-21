# Meal Magic

Recipe box, weekly meal planner and grocery list for the McMullen household.
Upload a recipe PDF, plan the week from your library, and hand the resulting
shopping list to Instacart.

## What works

- **Invite-only accounts.** Signup requires a code minted by an existing user.
  Every recipe is visible to every signed-in user; the library is shared.
- **Recipe library.** Create, edit and delete recipes with ingredients, method,
  servings, timings and tags.
- **Search.** Full-text plus substring matching across titles, descriptions,
  method text, ingredients and tags, with tag filters. Search state lives in the
  URL, so a filtered view is linkable.
- **PDF upload.** Signed-in users upload a recipe PDF; Claude extracts the
  fields and the dish photo is pulled out of the PDF, both landing on a review
  screen before anything is saved.
- **Weekly planner.** Assign recipes to breakfast/lunch/dinner across a week.
- **Grocery list.** Ingredients roll up across the week's meals, scaled to the
  servings planned and merged where names and units agree.
- **Shopping hand-off.** Send the week's list to Amazon Fresh or Whole Foods (a
  search link per ingredient plus a copyable list). An Instacart provider that
  builds a real cart is written and tested but cannot be enabled — see below.

## Stack

| Concern   | Choice                                        |
| --------- | --------------------------------------------- |
| Framework | Next.js 16 (App Router) + React 19            |
| Language  | TypeScript                                    |
| UI        | Material UI 9 (emotion), light + dark         |
| Database  | Postgres via Prisma 7                         |
| Auth      | Better Auth (email + password, invite-gated)  |
| Storage   | Vercel Blob, with a local-disk driver for dev |
| AI        | Claude (`claude-opus-5`) for PDF extraction   |
| Tests     | Vitest, against a real Postgres               |

## Getting started

```bash
npm install            # postinstall runs `prisma generate`
cp .env.example .env   # then fill in the values below
npm run db:migrate     # creates the schema
npm run dev            # http://localhost:3000
```

You need a Postgres instance. Anything works locally; production is Neon.

### Environment

| Variable                | Needed for            | Notes                                            |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `DATABASE_URL`          | everything            | Postgres connection string                       |
| `BETTER_AUTH_SECRET`    | sessions              | `openssl rand -base64 32`                        |
| `BETTER_AUTH_URL`       | sessions              | The app's own origin                             |
| `ANTHROPIC_API_KEY`     | PDF extraction        | Without it, upload returns a clear 422           |
| `INSTACART_API_KEY`     | sending a cart        | Without it, the planner says so and stays usable |
| `INSTACART_API_BASE`    | sending a cart        | Dev server by default; switch for production     |
| `BLOB_READ_WRITE_TOKEN` | uploads in production | Unset locally: files go to `public/uploads/`     |

Missing optional keys degrade gracefully — the rest of the app keeps working
and the affected feature explains what is missing.

### Creating the first account

Signup is invite-only and there is no bootstrap UI yet, so the first user is
made by hand:

```sql
INSERT INTO "user"(id, name, email, "emailVerified", "createdAt", "updatedAt")
VALUES ('bootstrap', 'Your Name', 'you@example.com', true, now(), now());

INSERT INTO invite(id, code, "expiresAt", "createdAt", "createdById")
VALUES ('bootstrap-invite', 'PICKSOMETHINGRANDOM', now() + interval '7 days', now(), 'bootstrap');
```

Then visit `/sign-up?code=PICKSOMETHINGRANDOM`. (Delete the placeholder row
afterwards if you like — the invite survives on its own.)

## Deploying

See [DEPLOYING.md](./DEPLOYING.md) for the full walkthrough — Neon, Vercel Blob,
environment variables, and creating the first account.

Two things that bite if skipped: migrations need Neon's **direct** connection
string (`DIRECT_DATABASE_URL`), not the pooled one, and without a Blob store
uploads land in `./public/uploads`, which serverless hosting wipes on every
deploy.

`GET /api/health` reports whether a deploy reached its database and whether the
schema is present.

## Scripts

| Script               | Does                                         |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Dev server                                   |
| `npm run build`      | Production build                             |
| `npm test`           | Vitest once (**truncates the dev database**) |
| `npm run lint`       | ESLint                                       |
| `npm run typecheck`  | Route types + `tsc --noEmit`                 |
| `npm run format`     | Prettier                                     |
| `npm run db:migrate` | Create and apply a migration                 |
| `npm run db:deploy`  | Apply migrations (production)                |
| `npm run db:studio`  | Prisma Studio                                |

The integration tests share one database and clean up after themselves, which
means running them against a database you care about will empty it.

## Notes and limitations

**Instacart does not place orders.** Both of its endpoints return a URL to a
prepared page; the customer checks out on Instacart. That is the entire
integration surface — nothing after the hand-off is visible to this app.

**Amazon cannot build a cart at all.** There is no public Amazon Fresh or Whole
Foods ordering API; access is granted case by case through a business
arrangement with Amazon's Fresh team. The add-to-cart URL
(`/gp/aws/cart/add.html?ASIN.1=…`) still works but needs ASINs, which means the
Product Advertising API — an Associates account with qualifying sales, and one
that does not reliably cover Fresh or Whole Foods grocery items. So the Amazon
providers do the honest thing: a search link per ingredient plus the list as
plain text. The UI says so rather than implying a basket was filled.

If you later obtain real Fresh API access, `src/lib/shopping/amazon.ts` is the
only file that needs to change — the provider interface already allows a `cart`
hand-off, and `ShoppingProvider` already distinguishes the two kinds.

**The Amazon storefront search aliases are unverified.** `i=amazonfresh` and
`i=wholefoods` scope a search to those storefronts, but amazon.com is blocked
from the environment this was built in, so the links were never followed. They
are trivially checkable in a browser: the link either lands in the right store
or it does not.

**Instacart cannot be switched on at present.** As of August 2026 Instacart is
not accepting new developer applications and offers no waitlist, which rules out
development and production keys alike — this is not a lead time to plan around,
it is a closed door.

The integration is kept rather than removed: it is written and tested, and works
the day applications reopen. Until then the Instacart button is disabled and says
why. Amazon Fresh and Whole Foods need no key and no approval, so they are the
shopping path that works today.

**The Instacart request shape is written from documentation, not from a live
call.** No API key was available while building it, and the docs host is
unreachable from the build environment, so the request is covered by tests
against a stubbed transport rather than a real response. Since applications are
closed there is currently no way to verify it against a real response — do that
before trusting it, whenever a key becomes obtainable.

**PDF photo extraction is JPEG-only.** Images stored as DCTDecode streams are
already complete JPEG files and can be written straight out. Other encodings
hold raw samples that would need colour-space handling and a PNG encoder.
Recipe photos are nearly always JPEG; one that is not simply arrives without a
photo, and can be added by hand.

**Unit merging is conservative.** Synonyms fold together (`tablespoons` →
`tbsp`), but nothing converts between units — 1 cup and 200 ml stay as two
lines. A silently wrong conversion is worse than a slightly longer list.

**Restart the dev server after a schema change.** `src/lib/db.ts` caches the
Prisma client on `globalThis` so Next's dev-mode module reloading doesn't open a
new connection pool on every edit. That cache survives HMR, so a client
regenerated by `prisma generate` isn't picked up by a running `next dev` — the
symptom is a server action failing with `Cannot read properties of undefined`
on a model you just renamed, while `npm test` and `npm run typecheck` pass
because they load a fresh client.

**`npm audit` reports a dev-only advisory** in `deepmerge-ts`, reached through
`@prisma/config` under the Prisma CLI. It is not reachable from application code
at runtime, and the only "fix" available downgrades to Prisma 6. Worth
re-checking when Prisma publishes.
