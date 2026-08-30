-- The uploaded card stops being a PDF specifically.
--
-- Renames rather than add-and-copy-and-drop: every one of these columns is
-- populated on real recipes, and RENAME COLUMN keeps the data, the type and
-- the constraint in place. A generated migration would have dropped and
-- recreated them, taking every stored PDF URL with it.
ALTER TABLE "recipe" RENAME COLUMN "pdfUrl" TO "sourceFileUrl";
ALTER TABLE "recipe" RENAME COLUMN "pdfFilename" TO "sourceFileName";
ALTER TABLE "recipe" RENAME COLUMN "pdfSha256" TO "sourceFileSha256";

-- Renaming a column leaves its index under the old name, which Prisma then
-- reads as drift and offers to "fix" by dropping the unique constraint that
-- stops the same card being uploaded twice.
ALTER INDEX "recipe_pdfSha256_key" RENAME TO "recipe_sourceFileSha256_key";

-- Null for every existing row: those are all PDFs, and the column exists so a
-- page can tell a PDF from a photograph without guessing at the file
-- extension. Backfilled rather than left to the reader.
ALTER TABLE "recipe" ADD COLUMN "sourceFileType" TEXT;
UPDATE "recipe" SET "sourceFileType" = 'application/pdf' WHERE "sourceFileUrl" IS NOT NULL;
