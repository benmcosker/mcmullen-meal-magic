-- Recipes become private by default, and existing ones stay shared.
ALTER TABLE "recipe" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;

-- Every recipe that existed before this column did was visible to every
-- signed-in person, and had been since the library was built. Defaulting them
-- to private would take dishes away from households that have been cooking
-- from them for months, so they keep the visibility they already had. Only
-- recipes added after this point start private.
UPDATE "recipe" SET "isShared" = true;

CREATE INDEX "recipe_isShared_idx" ON "recipe"("isShared");

-- The duplicate check moves from global to per household. A widely printed
-- card that two families both own is not a duplicate of anything; worse, a
-- global constraint answers the second family with the existence of a recipe
-- they cannot see.
DROP INDEX "recipe_sourceFileSha256_key";
CREATE UNIQUE INDEX "recipe_householdId_sourceFileSha256_key"
  ON "recipe"("householdId", "sourceFileSha256");
