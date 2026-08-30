import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

import {
  BRAND,
  CONTACT_EMAIL,
  LEGAL_UPDATED,
  SMS_FREQUENCY,
  SMS_NO_SHARING,
  SMS_RATES,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND}`,
  description: `What ${BRAND} stores and what it does not share.`,
};

/**
 * The privacy policy a carrier reads before approving the campaign.
 *
 * Three things have to be in it explicitly, and their absence is the usual
 * reason a registration is rejected: that mobile numbers are not shared, how
 * often messages arrive, and that message and data rates may apply. All three
 * come from `lib/legal.ts` so they say what the opt-in says.
 */
export default function PrivacyPage() {
  return (
    <>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Privacy Policy
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {BRAND} is a private, invite-only application used by one household to
        plan meals and shop for them. It is not a public service, it sells
        nothing, and it has no advertisers.
      </Typography>

      <Typography variant="h2" sx={{ mb: 1 }}>
        What is collected
      </Typography>
      <Typography sx={{ mb: 1 }}>
        A member&apos;s name and email address, needed to sign in. The recipes,
        weekly plans, pantry contents and notes they enter. Optionally, a mobile
        number, and the date on which that member agreed to be sent text
        messages.
      </Typography>
      <Typography sx={{ mb: 3 }}>
        No location, no contacts, no browsing history, and no advertising
        identifiers are collected. There is no tracking of members across other
        sites.
      </Typography>

      <Typography variant="h2" sx={{ mb: 1 }}>
        Mobile numbers
      </Typography>
      <Typography sx={{ mb: 1 }}>
        <strong>{SMS_NO_SHARING}</strong>
      </Typography>
      <Typography sx={{ mb: 1 }}>
        A number is used for one purpose: sending that member their
        household&apos;s weekly grocery list, when a member of that household
        asks for it to be sent. Messages arrive {SMS_FREQUENCY}. {SMS_RATES}
      </Typography>
      <Typography sx={{ mb: 3 }}>
        The number is passed to Twilio, the messaging provider that carries the
        message to the mobile network, and to nobody else. A member can remove
        their number at any time on the Household page, untick their agreement
        while keeping the number, or reply STOP to any message.
      </Typography>

      <Typography variant="h2" sx={{ mb: 1 }}>
        Who else sees anything
      </Typography>
      <Typography sx={{ mb: 3 }}>
        Recipes and plans are visible to the members of the same household.
        Beyond that, data is held by the services that run the application - its
        hosting and its database - and is not sold, rented, or given to anyone
        for marketing.
      </Typography>

      <Typography variant="h2" sx={{ mb: 1 }}>
        Keeping and deleting
      </Typography>
      <Typography sx={{ mb: 3 }}>
        Information is kept while the account exists. Ask at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to have an
        account and everything in it deleted.
      </Typography>

      <Typography variant="h2" sx={{ mb: 1 }}>
        Contact
      </Typography>
      <Typography sx={{ mb: 3 }}>
        Questions about this policy:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Last updated {LEGAL_UPDATED}.
      </Typography>
    </>
  );
}
