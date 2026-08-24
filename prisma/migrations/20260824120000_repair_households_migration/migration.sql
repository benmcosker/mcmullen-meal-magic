-- Repair a database that received the households migration in an earlier form.
--
-- The households migration was rewritten before it was merged - the library
-- went from private-per-household to shared, and invites gained a name for the
-- household they create. Prisma records a migration by name, so any database
-- that had already run the first version was never given the corrections: the
-- schema said one thing and the database another.
--
-- The symptom was narrow enough to be puzzling. Reading the household page
-- worked, because listing invites does not select the added column. Creating
-- one failed, because inserting an invite does - "column householdName of
-- relation invite does not exist", surfacing in the browser as a bare Next.js
-- error digest with nothing to explain it.
--
-- Every statement is idempotent. On a database that got the corrected version
-- this whole file does nothing, which is what makes it safe to ship to both.
-- It is also plain SQL by design: if `migrate deploy` is itself blocked, this
-- can be pasted into a database console and will do the same job.

-- What an invite calls the household it will create. Only set for an invite to
-- someone outside the family, which is the kind that makes a new household.
ALTER TABLE "invite" ADD COLUMN IF NOT EXISTS "householdName" TEXT;

-- The library is shared, so a recipe card already uploaded is already there for
-- everybody: the hash is unique across the whole library, not per household.
DROP INDEX IF EXISTS "recipe_householdId_pdfSha256_key";
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_pdfSha256_key" ON "recipe"("pdfSha256");

-- Reading the library is unfiltered, so this index serves only the ownership
-- check on edit and delete and has no use for the date.
DROP INDEX IF EXISTS "recipe_householdId_createdAt_idx";
CREATE INDEX IF NOT EXISTS "recipe_householdId_idx" ON "recipe"("householdId");
