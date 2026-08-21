-- Generalise the Instacart-only handoff record to any shopping provider.
--
-- Written as a rename plus alter rather than the drop-and-recreate Prisma
-- generates by default: existing handoff rows are history worth keeping, and a
-- migration that silently empties a table is a bad thing to have in the log
-- even while the table happens to be empty.

CREATE TYPE "ShoppingProvider" AS ENUM ('INSTACART', 'AMAZON_FRESH', 'WHOLE_FOODS');

ALTER TABLE "instacart_handoff" RENAME TO "shopping_handoff";

ALTER INDEX "instacart_handoff_pkey" RENAME TO "shopping_handoff_pkey";
ALTER INDEX "instacart_handoff_weekStart_idx" RENAME TO "shopping_handoff_weekStart_idx";
ALTER INDEX "instacart_handoff_createdById_idx" RENAME TO "shopping_handoff_createdById_idx";

ALTER TABLE "shopping_handoff"
  RENAME CONSTRAINT "instacart_handoff_createdById_fkey" TO "shopping_handoff_createdById_fkey";

-- Every row that predates this migration was an Instacart hand-off by
-- definition. Add the column with that default, then drop the default so new
-- rows must say which provider they used.
ALTER TABLE "shopping_handoff"
  ADD COLUMN "provider" "ShoppingProvider" NOT NULL DEFAULT 'INSTACART';
ALTER TABLE "shopping_handoff" ALTER COLUMN "provider" DROP DEFAULT;

-- Deep-link providers have no single URL representing the whole list.
ALTER TABLE "shopping_handoff" ALTER COLUMN "url" DROP NOT NULL;
