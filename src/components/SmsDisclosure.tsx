"use client";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

import {
  SMS_CONSENT_LABEL,
  SMS_FREQUENCY,
  SMS_HELP_STOP,
  SMS_RATES,
} from "@/lib/legal";

/**
 * The disclosures that have to sit beside any request for a phone number.
 *
 * One component rather than the same paragraph typed into three files: a
 * carrier reviewing an A2P 10DLC campaign compares the box a user ticks
 * against the public page describing the opt-in, and wording that has drifted
 * between them is a rejection. Sharing the component makes drift impossible
 * rather than unlikely.
 *
 * A client component, and it has to be. MUI's FormControlLabel reads
 * `control.props.disabled` while it renders, and an element handed to it
 * across the server/client boundary does not have `props` by then - the page
 * builds, returns 200, and then throws during hydration, which no amount of
 * typechecking catches. The directive keeps the whole subtree on one side.
 *
 * The links are plain MUI Links rather than next/link, for the neighbouring
 * reason: a function cannot cross from a server component into MUI's client
 * code, and `component={Link}` typechecks, builds, and then 500s at render. A
 * full navigation to a page somebody reads once is not worth that risk.
 */
export function SmsDisclosure() {
  return (
    <Box sx={{ "& p": { mb: 0.75 } }}>
      <Typography variant="body2" color="text.secondary">
        <strong>Message frequency:</strong> You will receive {SMS_FREQUENCY}.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>Standard rates:</strong> {SMS_RATES}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <strong>Help &amp; Stop:</strong> {SMS_HELP_STOP}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        <Link href="/terms">Terms of Service</Link>
        {" | "}
        <Link href="/privacy">Privacy Policy</Link>
      </Typography>
    </Box>
  );
}

/**
 * The consent tick itself.
 *
 * Never defaulted to checked, and there is no prop to make it so. A pre-ticked
 * box is not consent - it is the absence of a refusal - and it is the single
 * thing a campaign reviewer looks for hardest. Making that unexpressible here
 * is cheaper than remembering it at three call sites.
 */
export function SmsConsentCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  /**
   * Left off to render the box as an inert illustration.
   *
   * Optional rather than required-and-stubbed because the public policy page
   * is a server component, and a function cannot cross from one into MUI's
   * client code: `onChange={() => {}}` there typechecks, builds, and then 500s
   * at render. Omitting the prop is the only shape that is safe on both sides.
   */
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          {...(onChange
            ? { onChange: (e) => onChange(e.target.checked) }
            : { readOnly: true })}
          disabled={disabled}
          sx={{ alignSelf: "flex-start", pt: 0.25 }}
        />
      }
      label={
        <Typography variant="body2" color="text.secondary">
          {SMS_CONSENT_LABEL}
        </Typography>
      }
      sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
    />
  );
}
