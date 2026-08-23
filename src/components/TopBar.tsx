"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";

const navItems = [
  { href: "/recipes", label: "Recipes" },
  { href: "/plan", label: "This week" },
  { href: "/pantry", label: "Pantry" },
  { href: "/upload", label: "Upload" },
] as const;

/**
 * Client component on purpose: MUI's `component={Link}` passes a component
 * function as a prop, which a server component cannot send across the RSC
 * boundary. Only the serialisable parts of the user are handed in.
 */
export function TopBar({ userName }: { userName: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
        <Typography
          component={Link}
          href="/"
          variant="h3"
          sx={{ textDecoration: "none", color: "inherit", mr: 2 }}
        >
          Meal Magic
        </Typography>

        {userName ? (
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                color="inherit"
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        ) : (
          <Box sx={{ flexGrow: 1 }} />
        )}

        {userName ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {userName}
            </Typography>
            <Button
              size="small"
              color="inherit"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
                router.push("/sign-in");
                router.refresh();
              }}
            >
              Sign out
            </Button>
          </Stack>
        ) : (
          <Button component={Link} href="/sign-in" variant="contained">
            Sign in
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
