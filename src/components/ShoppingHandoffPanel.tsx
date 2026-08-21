"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import type { HandoffResult } from "@/lib/shopping";

/**
 * Renders the outcome of a hand-off.
 *
 * The two kinds are presented differently on purpose. A cart is done - one
 * link, go and pay. Deep links are a starting point that still needs work from
 * you, and saying so plainly is better than a success banner over a list of
 * search results.
 */
export function ShoppingHandoffPanel({ result }: { result: HandoffResult }) {
  const [copied, setCopied] = useState(false);

  if (!result.ok) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {result.error}
      </Alert>
    );
  }

  if (result.kind === "cart") {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        Your cart is ready, with {result.itemCount}{" "}
        {result.itemCount === 1 ? "item" : "items"}.{" "}
        <Link href={result.url} target="_blank" rel="noopener noreferrer">
          Open it to check out
        </Link>
        . Payment and delivery are handled there.
      </Alert>
    );
  }

  async function copyList() {
    if (result.ok !== true || result.kind !== "links") return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // The list is on screen either way, so this is not worth an error state.
      setCopied(false);
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        Amazon has no public ordering API, so this cannot fill a basket for you.
        Each ingredient below opens a search in the store; add what you want.
      </Alert>

      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={copyList}
        >
          {copied ? "Copied" : "Copy list as text"}
        </Button>
        <Button
          size="small"
          href={result.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon />}
        >
          Open the store
        </Button>
      </Stack>

      <Stack
        spacing={0.75}
        sx={{
          "& > :not(:last-child)": {
            borderBottom: 1,
            borderColor: "divider",
            pb: 0.75,
          },
        }}
      >
        {result.lines.map((line) => (
          <Typography key={`${line.name}-${line.amount}`} variant="body2">
            <Box component="span" sx={{ fontWeight: 600 }}>
              {line.amount}
            </Box>{" "}
            <Link href={line.url} target="_blank" rel="noopener noreferrer">
              {line.name}
            </Link>
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}
