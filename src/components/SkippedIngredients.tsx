"use client";

import UndoIcon from "@mui/icons-material/Undo";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useTransition } from "react";

import { unskipIngredientAction } from "@/app/plan/skip-actions";
import type { SkipRecord } from "@/lib/grocery";

/**
 * What is being kept off the list, and how to put it back.
 *
 * Visible rather than tucked into a settings page: a shopping list that
 * silently omits an ingredient is worse than a long one, so whatever is hidden
 * stays in sight next to the list it was removed from.
 */
export function SkippedIngredients({ skips }: { skips: SkipRecord[] }) {
  const [pending, startTransition] = useTransition();

  if (skips.length === 0) return null;

  const always = skips.filter((s) => s.scope === "ALWAYS");
  const thisWeek = skips.filter((s) => s.scope === "WEEK");

  return (
    <Box sx={{ mt: 3 }}>
      {always.length > 0 ? (
        <Group
          label="Always have"
          hint="Never appears on the list."
          skips={always}
          pending={pending}
          onUndo={(id) =>
            startTransition(async () => {
              await unskipIngredientAction(id);
            })
          }
        />
      ) : null}

      {thisWeek.length > 0 ? (
        <Group
          label="Got it this week"
          hint="Back on the list next week."
          skips={thisWeek}
          pending={pending}
          onUndo={(id) =>
            startTransition(async () => {
              await unskipIngredientAction(id);
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
  skips,
  pending,
  onUndo,
}: {
  label: string;
  hint: string;
  skips: SkipRecord[];
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
        {skips.map((skip) => (
          <Chip
            key={skip.id}
            label={skip.name}
            size="small"
            variant="outlined"
            disabled={pending}
            onDelete={() => onUndo(skip.id)}
            deleteIcon={<UndoIcon />}
          />
        ))}
      </Box>
    </Box>
  );
}
