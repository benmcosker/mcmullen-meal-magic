-- The pantry becomes a list you keep, not a way of dismissing a row.
--
-- "Always have" already existed as a scope on skipped_ingredient, but it was
-- only reachable by clicking beside an ingredient on a shopping list. You could
-- not tell the app you always have olive oil until olive oil turned up on a
-- list, which is exactly the moment it should already have known.
--
-- Splitting the two apart also makes each one honest about its lifetime: the
-- pantry is permanent and the weekly skip expires. Both were being expressed
-- as one nullable column and a partial index.

-- CreateTable
CREATE TABLE "pantry_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalisedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "pantry_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pantry_item_normalisedName_key" ON "pantry_item"("normalisedName");

-- CreateIndex
CREATE INDEX "pantry_item_createdById_idx" ON "pantry_item"("createdById");

-- AddForeignKey
ALTER TABLE "pantry_item" ADD CONSTRAINT "pantry_item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the existing staples across.
--
-- The partial unique index on the old table already guaranteed one ALWAYS row
-- per ingredient, so this cannot collide with the new unique index.
INSERT INTO "pantry_item" ("id", "name", "normalisedName", "createdAt", "createdById")
SELECT "id", "name", "normalisedName", "createdAt", "createdById"
FROM "skipped_ingredient"
WHERE "scope" = 'ALWAYS';

DELETE FROM "skipped_ingredient" WHERE "scope" = 'ALWAYS';

-- What is left is exactly "got it this week", so say so.
ALTER TABLE "skipped_ingredient" RENAME TO "weekly_skip";

ALTER TABLE "weekly_skip" RENAME CONSTRAINT "skipped_ingredient_pkey" TO "weekly_skip_pkey";
ALTER TABLE "weekly_skip" RENAME CONSTRAINT "skipped_ingredient_createdById_fkey" TO "weekly_skip_createdById_fkey";
ALTER INDEX "skipped_ingredient_createdById_idx" RENAME TO "weekly_skip_createdById_idx";
ALTER INDEX "skipped_ingredient_normalisedName_weekStart_key" RENAME TO "weekly_skip_normalisedName_weekStart_key";

-- The partial index existed only to constrain the ALWAYS rows that have just
-- left; the pantry's own unique index does that job now.
DROP INDEX "skipped_ingredient_always_key";

-- Every remaining row belongs to a week, so the column can stop being nullable
-- and the scope can go.
ALTER TABLE "weekly_skip" ALTER COLUMN "weekStart" SET NOT NULL;
ALTER TABLE "weekly_skip" DROP COLUMN "scope";

DROP TYPE "SkipScope";
