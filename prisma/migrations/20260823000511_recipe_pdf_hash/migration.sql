-- Recognise a PDF that has already been uploaded.
--
-- SHA-256 of the file's bytes. Unique, so the same document cannot produce two
-- recipes, and nullable for recipes typed in by hand - Postgres treats NULLs as
-- distinct in a unique index, so any number of manual recipes coexist happily
-- while one PDF maps to exactly one recipe.
--
-- The uniqueness matters beyond tidiness: it settles the race where two people
-- upload the same file at the same moment and both pass the pre-flight check.

ALTER TABLE "recipe" ADD COLUMN "pdfSha256" TEXT;

CREATE UNIQUE INDEX "recipe_pdfSha256_key" ON "recipe"("pdfSha256");
