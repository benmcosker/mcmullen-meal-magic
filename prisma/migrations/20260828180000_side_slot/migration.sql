-- A slot for something served alongside the dinner.
--
-- Postgres will not add an enum value inside a transaction that then uses it,
-- and Prisma wraps a migration in one - so this is the whole migration, and
-- anything reading MealSlot.SIDE waits for the next.
ALTER TYPE "MealSlot" ADD VALUE IF NOT EXISTS 'SIDE' AFTER 'DINNER';
