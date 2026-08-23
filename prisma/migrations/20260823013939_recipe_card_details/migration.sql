-- The rest of what a recipe card prints.
--
-- Oven temperature above all: a recipe you cannot start without hunting for
-- the original PDF is not really captured. Alongside it, the fields that
-- change how you plan or shop - resting time, what the batch actually makes,
-- what you need out of the cupboard before you begin, and who wrote it.

-- CreateEnum
CREATE TYPE "TemperatureUnit" AS ENUM ('FAHRENHEIT', 'CELSIUS');

-- AlterTable
ALTER TABLE "recipe" ADD COLUMN     "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ovenTemp" INTEGER,
ADD COLUMN     "ovenTempUnit" "TemperatureUnit",
ADD COLUMN     "restMinutes" INTEGER,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "yieldNote" TEXT;

-- A number with no unit is not a temperature.
--
-- 180 could be a slow oven in Fahrenheit or a hot one in Celsius, and guessing
-- wrong burns dinner. Either both columns are set or neither is.
ALTER TABLE "recipe"
  ADD CONSTRAINT "recipe_oven_temp_needs_unit"
  CHECK (("ovenTemp" IS NULL) = ("ovenTempUnit" IS NULL));

-- A wide backstop, not a style guide. It exists to catch a Celsius number
-- labelled Fahrenheit, which is the mistake that matters; dehydrator and
-- low-and-slow recipes live at the bottom of these ranges and are allowed.
ALTER TABLE "recipe"
  ADD CONSTRAINT "recipe_oven_temp_plausible"
  CHECK (
    "ovenTemp" IS NULL
    OR ("ovenTempUnit" = 'FAHRENHEIT' AND "ovenTemp" BETWEEN 100 AND 600)
    OR ("ovenTempUnit" = 'CELSIUS' AND "ovenTemp" BETWEEN 40 AND 315)
  );
