import Box from "@mui/material/Box";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";

/**
 * The public shell for the policy pages.
 *
 * No `requireHousehold()` anywhere beneath it, and that is the point: these
 * three URLs are submitted to a carrier as part of an A2P 10DLC campaign and
 * are read by a reviewer who has no account here. A policy behind a login is
 * a policy nobody can check, and the campaign is rejected.
 *
 * There is no middleware in this app - every other page gates itself by
 * calling the session helper - so being public is the default rather than
 * something that had to be arranged.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {/* Prose, not a three-column grid: 1440px of legal text is unreadable. */}
      <Box sx={{ maxWidth: 720 }}>{children}</Box>
    </AppShell>
  );
}
