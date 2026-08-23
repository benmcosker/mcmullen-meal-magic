"use client";

import UndoIcon from "@mui/icons-material/Undo";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useTransition } from "react";

import {
  removeFromPantryAction,
  unskipForWeekAction,
} from "@/app/plan/skip-actions";
import type { WeeklySkipRecord } from "@/lib/grocery";
import type { PantryItemRecord } from "@/lib/pantry";

/**
 * What is being kept off the list, and how to put it back.
 *
 * Visible rather than tucked into a settings page: a shopping list that
 * silently omits an ingredient is worse than a long one, so whatever is hidden
 * stays in sight next to the list it was removed from.
 */
export function ExcludedIngredients({
  pantry,
  skips,
}: {
  pantry: PantryItemRecord[];
  skips: WeeklySkipRecord[];
}) {
  const [pending, startTransition] = useTransition();

  if (pantry.length === 0 && skips.length === 0) return null;

  return (
    <Box sx={{ mt: 3 }}>
      {pantry.length > 0 ? (
        <Group
          label="Pantry"
          hint={
            <>
              Never appears on the list.{" "}
              <Link href="/pantry">Manage the pantry</Link>
            </>
          }
          items={pantry}
          pending={pending}
          onUndo={(id) =>
            startTransition(async () => {
              await removeFromPantryAction(id);
            })
          }
        />
      ) : null}

      {skips.length > 0 ? (
        <Group
          label="Got it this week"
          hint="Back on the list next week."
          items={skips}
          pending={pending}
          onUndo={(id) =>
            startTransition(async () => {
              await unskipForWeekAction(id);
            })
          }
        />
      ) : null}
    </Box>
  );
}

function Group({
  label,
  hint,
  items,
  pending,
  onUndo,
}: {
  label: string;
  hint: React.ReactNode;
  items: { id: string; name: string }[];
  pending: boolean;
  onUndo: (id: string) => void;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        <Box component="span" sx={{ fontWeight: 600 }}>
          {label}
        </Box>{" "}
        — {hint}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
        {items.map((item) => (
          <Chip
            key={item.id}
            label={item.name}
            size="small"
            variant="outlined"
            disabled={pending}
            onDelete={() => onUndo(item.id)}
            deleteIcon={<UndoIcon />}
          />
        ))}
      </Box>
    </Box>
  );
}
