"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { addExtraItemAction } from "@/app/plan/extra-actions";

/**
 * Putting something on the week that no recipe asked for.
 *
 * Amount is a second field rather than something read out of the name,
 * because splitting "2 lemons" into a number and a noun works right up until
 * somebody types "7 Up". Two fields ask the question plainly and never guess
 * wrong; the amount is free text, so "a big bag" is a valid answer.
 */
export function AddExtraItem({ weekStartIso }: { weekStartIso: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const result = await addExtraItemAction(
        { name: trimmed, amount: amount.trim() || null },
        weekStartIso,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setAmount("");
      router.refresh();
    });
  }

  return (
    <Box component="form" onSubmit={add} sx={{ mb: 2 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 0.5 }}
      >
        Anything else you need
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          label="Item"
          placeholder="Kitchen roll"
          size="small"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          label="Amount"
          placeholder="2"
          size="small"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={pending}
          // Wide enough for "a big bag" without taking the room the name needs.
          sx={{ width: { xs: 96, sm: 128 }, flexShrink: 0 }}
        />
        {/*
         * Filled rather than outlined. Outlined in this theme is a muted
         * border on the page colour, which beside two text fields of the same
         * height reads as a third empty box rather than as the button.
         */}
        <Button
          type="submit"
          variant="contained"
          disabled={pending || !name.trim()}
          // Matches the height of the small fields beside it.
          sx={{ flexShrink: 0, height: 40, px: 2.5 }}
        >
          Add
        </Button>
      </Stack>
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
}
