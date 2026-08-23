"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition, type FormEvent } from "react";

import {
  addPantryItemAction,
  removePantryItemAction,
} from "@/app/pantry/actions";
import type { PantryItemRecord } from "@/lib/pantry";
import { SUGGESTED_PANTRY_STAPLES } from "@/lib/pantry-staples";

/**
 * The pantry as a list you keep, rather than a way of dismissing a row.
 *
 * Everything here is something the household always has in, so it never
 * reaches a shopping list. Adding an item before it ever shows up on a week's
 * shopping is the whole point - the old "always have" button could only be
 * reached once the ingredient had already appeared.
 */
export function PantryManager({ items }: { items: PantryItemRecord[] }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = draft.trim();
  const has = (name: string) =>
    items.some((item) => item.name.toLowerCase() === name.toLowerCase());
  const alreadyThere = has(trimmed);
  const missingStaples = SUGGESTED_PANTRY_STAPLES.filter((s) => !has(s));

  function add(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const result = await addPantryItemAction(trimmed);
      if (result.ok) {
        setDraft("");
      } else {
        setError(result.error);
      }
    });
  }

  function addNamed(names: readonly string[]) {
    startTransition(async () => {
      // Sequential rather than parallel: each one revalidates the pantry and
      // the plan, and eleven concurrent revalidations of the same two paths is
      // a lot of work to arrive at the same answer.
      for (const name of names) {
        await addPantryItemAction(name);
      }
    });
  }

  return (
    <Box>
      <Stack
        component="form"
        onSubmit={add}
        direction="row"
        spacing={1}
        sx={{ alignItems: "flex-start", mb: 1 }}
      >
        <TextField
          label="Add a staple"
          placeholder="Olive oil"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
          size="small"
          fullWidth
          sx={{ maxWidth: 360 }}
          helperText={
            alreadyThere ? "Already in the pantry." : "Salt, flour, olive oil…"
          }
        />
        <Button
          type="submit"
          variant="contained"
          disabled={pending || !trimmed || alreadyThere}
        >
          Add
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {missingStaples.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              Common staples — tap to add
            </Typography>
            <Button
              size="small"
              disabled={pending}
              onClick={() => addNamed(missingStaples)}
            >
              Add all {missingStaples.length}
            </Button>
          </Stack>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {missingStaples.map((name) => (
              <Chip
                key={name}
                label={name}
                size="small"
                variant="outlined"
                disabled={pending}
                onClick={() => addNamed([name])}
              />
            ))}
          </Box>
        </Box>
      ) : null}

      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nothing here yet. Anything you add stops appearing on the weekly
          shopping list.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {items.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              disabled={pending}
              onDelete={() =>
                startTransition(async () => {
                  await removePantryItemAction(item.id);
                })
              }
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
