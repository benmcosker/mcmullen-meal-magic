-- Replaces the unused grocery_item table with an exclusion list.
--
-- grocery_item was added for tick-offs and never wired up: no code path ever
-- inserted a row, so dropping it loses nothing. It modelled a materialised
-- shopping list, which would have to be reconciled against hand edits every
-- time the week's plan changed. The list stays derived from planned meals, and
-- only the exclusions are stored.
-- CreateEnum
CREATE TYPE "SkipScope" AS ENUM ('WEEK', 'ALWAYS');

-- DropForeignKey
ALTER TABLE "grocery_item" DROP CONSTRAINT "grocery_item_recipeId_fkey";

-- DropTable
DROP TABLE "grocery_item";

-- DropEnum
DROP TYPE "GroceryItemSource";

-- CreateTable
CREATE TABLE "skipped_ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalisedName" TEXT NOT NULL,
    "scope" "SkipScope" NOT NULL,
    "weekStart" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "skipped_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skipped_ingredient_createdById_idx" ON "skipped_ingredient"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "skipped_ingredient_normalisedName_weekStart_key" ON "skipped_ingredient"("normalisedName", "weekStart");

-- AddForeignKey
ALTER TABLE "skipped_ingredient" ADD CONSTRAINT "skipped_ingredient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One permanent skip per ingredient.
--
-- The unique index above covers WEEK rows, but Postgres treats NULLs as
-- distinct, so it would happily accept "olive oil" as an ALWAYS staple twice
-- over. A partial index constrains the rows the other one cannot reach.
CREATE UNIQUE INDEX "skipped_ingredient_always_key"
  ON "skipped_ingredient" ("normalisedName")
  WHERE "weekStart" IS NULL;
