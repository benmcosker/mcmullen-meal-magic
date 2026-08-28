"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState, useTransition } from "react";

import {
  acceptSideAction,
  suggestSidesForDayAction,
  type SideOption,
} from "@/app/plan/actions";

/**
 * Three sides worth putting beside the dinner, and why each one.
 *
 * The reasons are shown rather than kept to the ranking, because a suggestion
 * nobody can account for is a suggestion nobody trusts - and "roasts alongside
 * at 425F" is the sort of thing that makes the difference between taking the
 * suggestion and ignoring the feature.
 */
export function SideSuggestionDialog({
  open,
  dateIso,
  weekStartIso,
  dayLabel,
  onClose,
}: {
  open: boolean;
  dateIso: string;
  weekStartIso: string;
  dayLabel: string;
  onClose: () => void;
}) {
  /**
   * Held against the day it was worked out for, rather than cleared when the
   * dialog reopens.
   *
   * Clearing it would mean calling setState in the body of the effect, which
   * renders once to blank the list and again when the answer arrives. Keeping
   * the day alongside the answer makes "nothing for this day yet" and "still
   * loading" the same thing, derived rather than stored.
   */
  const [loaded, setLoaded] = useState<{
    date: string;
    options: SideOption[];
  } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = loaded?.date === dateIso ? loaded.options : null;
  const loadError =
    failed === dateIso ? "Could not work out a side just now." : null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    suggestSidesForDayAction(dateIso)
      .then((result) => {
        if (!cancelled) setLoaded({ date: dateIso, options: result });
      })
      .catch(() => {
        if (!cancelled) setFailed(dateIso);
      });

    return () => {
      cancelled = true;
    };
  }, [open, dateIso]);

  function accept(sideId: string) {
    setError(null);
    startTransition(async () => {
      const result = await acceptSideAction(weekStartIso, dateIso, sideId);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Something alongside {dayLabel}</DialogTitle>
      <DialogContent>
        {(error ?? loadError) ? (
          <Typography color="error" sx={{ mb: 2 }}>
            {error ?? loadError}
          </Typography>
        ) : null}

        {options === null ? (
          <Typography color="text.secondary">Having a look…</Typography>
        ) : options.length === 0 ? (
          <Typography color="text.secondary">
            Plan a dinner first, and there will be something to go with it.
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ pb: 1 }}>
            {options.map((option) => (
              <Stack
                key={option.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  alignItems: { sm: "center" },
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: 1.5,
                }}
              >
                <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {option.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {option.description} · {option.minutes} min
                  </Typography>
                  {option.reasons.length > 0 ? (
                    <Stack
                      direction="row"
                      sx={{ flexWrap: "wrap", gap: 0.5, mt: 0.75 }}
                    >
                      {option.reasons.map((reason) => (
                        <Chip key={reason} label={reason} size="small" />
                      ))}
                    </Stack>
                  ) : null}
                </Stack>
                <Button
                  variant="outlined"
                  disabled={pending}
                  onClick={() => accept(option.id)}
                  sx={{ flexShrink: 0 }}
                >
                  Add it
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
