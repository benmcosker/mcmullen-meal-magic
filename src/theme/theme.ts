"use client";

import { createTheme } from "@mui/material/styles";

/**
 * One theme, both colour schemes. MUI resolves light/dark from the user's
 * system preference via CSS variables, so there is no flash of the wrong
 * theme on first paint and no client-side toggle to hydrate.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#2f6f4e" },
        secondary: { main: "#b4552d" },
        background: { default: "#fbfaf7", paper: "#ffffff" },
      },
    },
    dark: {
      palette: {
        primary: { main: "#7fc4a0" },
        secondary: { main: "#e08a5f" },
        background: { default: "#12140f", paper: "#1b1e18" },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    h1: { fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em" },
    h3: { fontSize: "1.15rem", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiCard: { defaultProps: { variant: "outlined" } },
    MuiTextField: { defaultProps: { size: "small" } },
  },
});
