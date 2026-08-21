# Deploying Meal Magic

Target: Vercel for hosting, Neon for Postgres, Vercel Blob for uploaded PDFs and
photos. Everything below needs accounts you control; nothing here can be done
on your behalf.

Budget about half an hour, most of it waiting for DNS and a first build.

## 1. Database (Neon)

Create a project at [neon.tech](https://neon.tech). From the connection details
panel, copy **both** connection strings:

| Neon calls it     | Goes in               | Used by         |
| ----------------- | --------------------- | --------------- |
| Pooled connection | `DATABASE_URL`        | the running app |
| Direct connection | `DIRECT_DATABASE_URL` | migrations only |

Both are needed, and they are not interchangeable. Neon's pooled endpoint runs
PgBouncer in transaction mode, which does not support the session-level locks
Prisma Migrate takes out — migrations against it hang or fail with errors that
do not mention pooling. The app wants the pooled URL, because serverless
functions open far more connections than Postgres will accept directly.

## 2. Blob storage (Vercel)

In the Vercel dashboard: **Storage → Create → Blob**, then connect it to the
project. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically — you do not copy
it by hand.

Skipping this step is worse than it looks. Uploads fall back to
`./public/uploads`, which on serverless hosting is a fresh empty directory on
every deploy: every photo silently disappears the next time you push.

## 3. Project (Vercel)

Import the GitHub repo. The defaults are correct — the build command does not
need changing, because `package.json` defines a `vercel-build` script that
Vercel prefers automatically:

```
prisma migrate deploy && next build
```

That runs pending migrations against `DIRECT_DATABASE_URL` before building, so
a deploy that changes the schema applies it rather than booting against the old
one.

## 4. Environment variables

Set these in **Settings → Environment Variables**, for Production and Preview:

| Variable                | Required | Value                                                                                                                                          |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | yes      | Neon **pooled** string                                                                                                                         |
| `DIRECT_DATABASE_URL`   | yes      | Neon **direct** string                                                                                                                         |
| `BETTER_AUTH_SECRET`    | yes      | `openssl rand -base64 32` — a fresh one, not the dev value                                                                                     |
| `BETTER_AUTH_URL`       | yes      | The deployed origin, e.g. `https://meal-magic.vercel.app`                                                                                      |
| `ANTHROPIC_API_KEY`     | no       | Enables PDF extraction                                                                                                                         |
| `INSTACART_API_KEY`     | no       | **Not obtainable.** Instacart has closed new developer applications with no waitlist. Leave unset; the button stays disabled and explains why. |
| `INSTACART_API_BASE`    | no       | Only meaningful once a key exists: `https://connect.dev.instacart.tools` for development, `https://connect.instacart.com` for production       |
| `BLOB_READ_WRITE_TOKEN` | —        | Injected by Vercel when the Blob store is connected                                                                                            |

The app refuses to start if a required variable is missing, and names all of
them at once rather than failing on the first. Optional ones are logged at boot
with what each costs.

**Preview deployments get a different origin per branch**, so `BETTER_AUTH_URL`
set to the production domain will break sign-in on previews. Either set it per
environment, or accept that previews cannot authenticate.

## 5. Check the deploy

```bash
curl https://your-app.vercel.app/api/health
```

Healthy:

```json
{
  "status": "ok",
  "database": { "reachable": true, "migrated": true, "users": 0 }
}
```

It runs a real query rather than returning a bare 200, because the failures
worth catching all look like a healthy app until something touches the
database. The three states it distinguishes:

| Response                           | Meaning                             | Fix                                                         |
| ---------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| `reachable: false`                 | Wrong or unreachable `DATABASE_URL` | Check the pooled string and Neon's IP rules                 |
| `reachable: true, migrated: false` | Connected, schema never created     | The `vercel-build` script did not run — check the build log |
| `status: ok`                       | Working                             | —                                                           |

`disabledFeatures` lists any optional integration that is off, so you can tell
a deliberate omission from a typo in a key name.

## 6. Create the first account

Signup is invite-only and there is no bootstrap screen, so the first account is
made by hand. Against the **direct** connection:

```sql
INSERT INTO "user"(id, name, email, "emailVerified", "createdAt", "updatedAt")
VALUES ('bootstrap', 'Your Name', 'you@example.com', true, now(), now());

INSERT INTO invite(id, code, "expiresAt", "createdAt", "createdById")
VALUES ('bootstrap-invite', 'PICKSOMETHINGRANDOM',
        now() + interval '7 days', now(), 'bootstrap');
```

Then open `https://your-app.vercel.app/sign-up?code=PICKSOMETHINGRANDOM`.

That row is a placeholder, not a login — it has no password and cannot sign in.
Delete it once your real account exists:

```sql
DELETE FROM "user" WHERE id = 'bootstrap';
```

The invite survives on its own; deleting the placeholder does not revoke the
account it created.

Everyone after the first is invited from inside the app.

## Rolling back

Vercel's instant rollback reverts the code but **not** the database. A deploy
that ran a destructive migration is not undone by rolling back the deploy — the
old code then runs against the new schema, which usually fails in a less
obvious way than the deploy did. Migrations in this repo are written to be
additive for that reason; keep them that way, or take a Neon branch before
deploying anything that drops a column.
