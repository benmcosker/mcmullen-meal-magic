-- Consent to be texted, kept as its own fact rather than inferred from having
-- a number on file.
--
-- The two are genuinely different: a number is how to reach somebody, consent
-- is whether they said you may. US carriers require the second one to be
-- recorded and producible, and "we had their number" is not an answer to a
-- carrier that asks to see the opt-in.
CREATE TYPE "SmsConsentSource" AS ENUM ('CHECKBOX', 'IMPORTED');

ALTER TABLE "user"
  ADD COLUMN "smsConsentAt" TIMESTAMP(3),
  ADD COLUMN "smsConsentSource" "SmsConsentSource";

-- Numbers already on file keep working rather than going quiet on deploy.
--
-- IMPORTED rather than CHECKBOX, deliberately: these people gave a number
-- before there was a box to tick, and writing them down as having ticked it
-- would put a consent in the record that nobody actually gave. The column says
-- what really happened, so an audit reads honestly and these rows can be told
-- apart from real opt-ins later.
UPDATE "user"
SET "smsConsentAt" = CURRENT_TIMESTAMP,
    "smsConsentSource" = 'IMPORTED'
WHERE "phone" IS NOT NULL;
