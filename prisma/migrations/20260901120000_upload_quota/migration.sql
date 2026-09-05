-- A per-person daily ceiling on reading recipe cards.
--
-- Extraction is the one operation here that costs money every time it runs,
-- and the upload endpoint is reachable by anybody with an account. A counter
-- row per person per day is enough to bound that, and needs no infrastructure
-- the app does not already have.
CREATE TABLE "upload_quota" (
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "upload_quota_pkey" PRIMARY KEY ("userId", "day")
);

ALTER TABLE "upload_quota"
  ADD CONSTRAINT "upload_quota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
