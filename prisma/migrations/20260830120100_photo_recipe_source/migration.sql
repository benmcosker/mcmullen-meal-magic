-- A recipe read from a photograph of a card rather than a PDF of one.
--
-- Postgres will not add an enum value inside a transaction that then uses it,
-- and Prisma wraps a migration in one - so this is the whole migration, and
-- anything writing RecipeSource.PHOTO waits for the next.
ALTER TYPE "RecipeSource" ADD VALUE IF NOT EXISTS 'PHOTO' AFTER 'PDF';
