-- A phone number for the people who want the week's shopping texted to them.
--
-- Nullable, and stays nullable: it buys exactly one feature, and an account
-- without one is entirely usable. Stored E.164 - "+15551234567" - because that
-- is the only shape a carrier accepts, and a number kept as somebody typed it
-- is a number that has to be guessed at on the way out, every single time.
ALTER TABLE "user" ADD COLUMN "phone" TEXT;
