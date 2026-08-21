"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

import { RecipeTile, type TileRecipe } from "./RecipeTile";

/**
 * Pick a recipe for one day.
 *
 * Filtering is a plain substring match on the title, done in the browser over
 * the recipes already loaded for the planner. The proper search - stemming,
 * ingredients, tags - lives on /recipes and needs the server; reaching for it
 * here would mean a round trip per keystroke to choose between the handful of
 * recipes a household actually cooks.
 */
export function RecipePickerDialog({
  open,
  dayLabel,
  recipes,
  selectedId,
  onPick,
  onClose,
}: {
  open: boolean;
  dayLabel: string;
  recipes: TileRecipe[];
  selectedId: string | null;
  onPick: (recipeId: string | null) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(needle));
  }, [filter, recipes]);

  function close() {
    setFilter("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{dayLabel}</DialogTitle>

      <DialogContent dividers>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Filter by name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ mb: 2 }}
        />

        {shown.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3 }} align="center">
            {recipes.length === 0
              ? "No recipes in the library yet."
              : "Nothing matches that."}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {shown.map((recipe) => (
              <Grid key={recipe.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <CardActionArea
                  onClick={() => {
                    onPick(recipe.id);
                    close();
                  }}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    border: 2,
                    borderColor:
                      recipe.id === selectedId ? "primary.main" : "transparent",
                  }}
                >
                  <RecipeTile recipe={recipe} height={110} />
                </CardActionArea>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Box>
          {selectedId ? (
            <Button
              color="error"
              onClick={() => {
                onPick(null);
                close();
              }}
            >
              Clear this day
            </Button>
          ) : null}
        </Box>
        <Button onClick={close}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
