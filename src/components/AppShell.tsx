import Box from "@mui/material/Box";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/session";
import { PAGE_MAX_WIDTH, PAGE_PADDING_X } from "@/theme/page";

import { TopBar } from "./TopBar";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <TopBar userName={user?.name ?? null} />
      {/*
       * A plain Box rather than a Container. Container's `maxWidth="lg"` is
       * 1200px with 24px gutters, which put the page title 120px in from a
       * 1440px window while the top bar's wordmark sat at 56px - the two left
       * edges never lined up. These are the design's own measurements instead.
       */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          maxWidth: PAGE_MAX_WIDTH,
          mx: "auto",
          px: PAGE_PADDING_X,
          pt: { xs: 4, md: 7 },
          pb: { xs: 6, md: 9 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
