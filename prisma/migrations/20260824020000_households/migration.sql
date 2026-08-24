-- Households: the unit the weekly cooking is scoped to.
--
-- The app was built as one family with the scoping left implicit - one plan,
-- one pantry, and a unique constraint on (date, slot) meaning there was exactly
-- one Tuesday dinner in the entire database. This migration makes that unit a
-- real record so a second family can use the app without colliding with the
-- first.
--
-- The recipe library stays shared. Every household reads, searches, plans and
-- reviews the whole of it; a recipe carries a household only so that the family
-- who added it is the family who can change or remove it. What is private is
-- the week: the plan, the pantry, this week's skips, and the shopping handed to
-- a shop.
--
-- Written by hand rather than generated. The generated version adds the
-- household columns as NOT NULL in one step, which fails outright on any
-- database that already has rows in it - which is to say, on the live one. The
-- order here is: add the columns nullable, fold every existing row into a
-- single founding household, and only then enforce.

-- CreateTable
CREATE TABLE "household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_pkey" PRIMARY KEY ("id")
);

-- AlterTable: nullable for now, so existing rows survive the addition.
ALTER TABLE "user" ADD COLUMN "householdId" TEXT;
ALTER TABLE "invite" ADD COLUMN "householdId" TEXT;
ALTER TABLE "invite" ADD COLUMN "householdName" TEXT;
ALTER TABLE "recipe" ADD COLUMN "householdId" TEXT;
ALTER TABLE "planned_meal" ADD COLUMN "householdId" TEXT;
ALTER TABLE "pantry_item" ADD COLUMN "householdId" TEXT;
ALTER TABLE "weekly_skip" ADD COLUMN "householdId" TEXT;
ALTER TABLE "shopping_handoff" ADD COLUMN "householdId" TEXT;

-- Everything that exists today belongs to the one family that has been using
-- the app, so it all moves into a single founding household.
--
-- Skipped entirely on an empty database: a fresh deployment should not come up
-- with a household nobody is in. `planned_meal` is checked alongside `user`
-- because it is the one scoped table with no owning user of its own, so rows
-- there can in principle outlive every account.
DO $$
DECLARE
  founding TEXT := 'founding-household';
BEGIN
  IF EXISTS (SELECT 1 FROM "user") OR EXISTS (SELECT 1 FROM "planned_meal") THEN
    INSERT INTO "household" ("id", "name") VALUES (founding, 'Our Household');

    UPDATE "user" SET "householdId" = founding;
    UPDATE "recipe" SET "householdId" = founding;
    UPDATE "planned_meal" SET "householdId" = founding;
    UPDATE "pantry_item" SET "householdId" = founding;
    UPDATE "weekly_skip" SET "householdId" = founding;
    UPDATE "shopping_handoff" SET "householdId" = founding;

    -- An invite already sent was issued from inside that household, so it still
    -- joins it. Spent invites are left null: the column says where a code will
    -- take you, and a redeemed code takes nobody anywhere.
    UPDATE "invite" SET "householdId" = founding WHERE "redeemedAt" IS NULL;
  END IF;
END $$;

-- Now enforce. `user` and `invite` stay nullable on purpose: better-auth's
-- Prisma adapter inserts the user row itself and knows nothing about this
-- column, and a null invite household is what marks an invitation to someone
-- outside the family, who gets a household of their own on redeeming it.
ALTER TABLE "recipe" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "planned_meal" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "pantry_item" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "weekly_skip" ALTER COLUMN "householdId" SET NOT NULL;
ALTER TABLE "shopping_handoff" ALTER COLUMN "householdId" SET NOT NULL;

-- The constraints that made the app single-family. Each gains the household, so
-- two families can plan the same Tuesday and keep the same staple in the pantry.
-- The recipe hash is deliberately not among them: the library is shared, so a
-- card somebody has already uploaded is already there for everybody.
DROP INDEX "planned_meal_date_slot_key";
CREATE UNIQUE INDEX "planned_meal_householdId_date_slot_key" ON "planned_meal"("householdId", "date", "slot");

DROP INDEX "pantry_item_normalisedName_key";
CREATE UNIQUE INDEX "pantry_item_householdId_normalisedName_key" ON "pantry_item"("householdId", "normalisedName");

DROP INDEX "weekly_skip_normalisedName_weekStart_key";
CREATE UNIQUE INDEX "weekly_skip_householdId_normalisedName_weekStart_key" ON "weekly_skip"("householdId", "normalisedName", "weekStart");

-- Lookups on the week are all household-scoped now, so those indexes lead with
-- it. The recipe index serves the ownership check on edit and delete; reading
-- the library is unfiltered and goes on using the indexes it always did.
DROP INDEX "planned_meal_date_idx";
CREATE INDEX "planned_meal_householdId_date_idx" ON "planned_meal"("householdId", "date");

DROP INDEX "shopping_handoff_weekStart_idx";
CREATE INDEX "shopping_handoff_householdId_weekStart_idx" ON "shopping_handoff"("householdId", "weekStart");

CREATE INDEX "recipe_householdId_idx" ON "recipe"("householdId");
CREATE INDEX "user_householdId_idx" ON "user"("householdId");
CREATE INDEX "invite_householdId_idx" ON "invite"("householdId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invite" ADD CONSTRAINT "invite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "planned_meal" ADD CONSTRAINT "planned_meal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pantry_item" ADD CONSTRAINT "pantry_item_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_skip" ADD CONSTRAINT "weekly_skip_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_handoff" ADD CONSTRAINT "shopping_handoff_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
