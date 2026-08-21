"use client";

import AddIcon from "@mui/icons-material/Add";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  sendWeekToProviderAction,
  setPlannedMealAction,
} from "@/app/plan/actions";
import type { MealSlot, ShoppingProvider } from "@/generated/prisma/enums";
import type { GroceryLine } from "@/lib/grocery";
import type { HandoffResult, ProviderInfo } from "@/lib/shopping";

import { RecipePickerDialog } from "./RecipePickerDialog";
import { RecipeTile, type TileRecipe } from "./RecipeTile";
import { ShoppingHandoffPanel } from "./ShoppingHandoffPanel";

/**
 * One meal a day.
 *
 * It is dinner, and that is what gets stored, but the plan only ever holds one
 * meal per day so labelling it adds a word without adding information. MealSlot
 * keeps its other values: the column is there if a second meal is ever wanted,
 * and unused enum values cost nothing.
 */
const MEAL_SLOT: MealSlot = "DINNER";
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type PlannedMeal = {
  date: string;
  slot: MealSlot;
  recipeId: string | null;
  servings: number;
  title: string | null;
};

function formatAmount(line: GroceryLine): string {
  if (line.quantity == null) return "";
  const amount = Number.isInteger(line.quantity)
    ? String(line.quantity)
    : String(line.quantity);
  return line.unit ? `${amount} ${line.unit}` : amount;
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function WeekPlanner({
  weekStartIso,
  prevWeekIso,
  nextWeekIso,
  recipes,
  meals,
  groceries,
  providers,
}: {
  weekStartIso: string;
  prevWeekIso: string;
  nextWeekIso: string;
  recipes: (TileRecipe & { servings: number })[];
  meals: PlannedMeal[];
  groceries: GroceryLine[];
  providers: ProviderInfo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [picking, setPicking] = useState<{ date: string; day: string } | null>(
    null,
  );
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const [sendingTo, setSendingTo] = useState<ShoppingProvider | null>(null);

  const byKey = new Map(meals.map((m) => [`${m.date}|${m.slot}`, m]));

  function assign(date: string, recipeId: string | null) {
    const recipe = recipes.find((r) => r.id === recipeId);
    startTransition(async () => {
      await setPlannedMealAction({
        date,
        slot: MEAL_SLOT,
        recipeId,
        servings: recipe?.servings ?? 4,
      });
      router.refresh();
    });
  }

  async function sendTo(providerId: ShoppingProvider) {
    setSendingTo(providerId);
    setHandoff(null);

    setHandoff(await sendWeekToProviderAction(weekStartIso, providerId));
    setSendingTo(null);
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            component={Link}
            href={`/plan?week=${prevWeekIso}`}
            size="small"
          >
            ← Previous
          </Button>
          <Typography variant="body2" color="text.secondary">
            Week of {weekStartIso}
          </Typography>
          <Button
            component={Link}
            href={`/plan?week=${nextWeekIso}`}
            size="small"
          >
            Next →
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {DAY_NAMES.map((day, index) => {
          const date = addDaysIso(weekStartIso, index);
          const plannedId = byKey.get(`${date}|${MEAL_SLOT}`)?.recipeId ?? null;
          const planned = recipes.find((r) => r.id === plannedId) ?? null;
          return (
            <Grid key={date} size={{ xs: 6, sm: 4, md: 3, lg: 12 / 7 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "baseline", gap: 0.75, mb: 1.25 }}
                  >
                    <Typography variant="subtitle2">{day}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {date.slice(5)}
                    </Typography>
                  </Stack>

                  <CardActionArea
                    onClick={() => setPicking({ date, day })}
                    disabled={pending}
                    sx={{ borderRadius: 1.5, p: 0.5 }}
                  >
                    {planned ? (
                      <RecipeTile recipe={planned} />
                    ) : (
                      <Box
                        sx={{
                          height: 96,
                          borderRadius: 1,
                          border: 1,
                          borderStyle: "dashed",
                          borderColor: "divider",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "text.disabled",
                          gap: 0.5,
                        }}
                      >
                        <AddIcon fontSize="small" />
                        <Typography variant="caption">Add a meal</Typography>
                      </Box>
                    )}
                  </CardActionArea>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <RecipePickerDialog
        open={picking !== null}
        dayLabel={picking ? `What are we eating on ${picking.day}?` : ""}
        recipes={recipes}
        selectedId={
          picking
            ? (byKey.get(`${picking.date}|${MEAL_SLOT}`)?.recipeId ?? null)
            : null
        }
        onPick={(recipeId) => {
          if (picking) assign(picking.date, recipeId);
        }}
        onClose={() => setPicking(null)}
      />

      <Card>
        <CardContent>
          <Typography variant="h2" sx={{ mb: 2 }}>
            Grocery list
          </Typography>

          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 1.5 }}>
            {providers.map((provider) => (
              <Button
                key={provider.id}
                variant={provider.kind === "cart" ? "contained" : "outlined"}
                startIcon={<ShoppingCartIcon />}
                // `available` was computed but never used, so a provider
                // that cannot possibly succeed still invited a click and
                // answered with an error.
                disabled={
                  !provider.available ||
                  sendingTo !== null ||
                  groceries.length === 0
                }
                onClick={() => sendTo(provider.id)}
              >
                {sendingTo === provider.id ? "Working\u2026" : provider.label}
              </Button>
            ))}
          </Stack>

          {/*
           * Spelled out per provider, because the two kinds behave very
           * differently and a row of similar buttons would imply otherwise.
           */}
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {providers.map((provider) => (
              <Typography
                key={provider.id}
                variant="caption"
                color="text.secondary"
              >
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {provider.label}:
                </Box>{" "}
                {provider.description}
                {provider.available ? "" : ` ${provider.unavailableReason}`}
              </Typography>
            ))}
          </Stack>

          {handoff ? <ShoppingHandoffPanel result={handoff} /> : null}

          {groceries.length === 0 ? (
            <Typography color="text.secondary">
              Plan some meals and the ingredients will collect here.
            </Typography>
          ) : (
            <Stack
              spacing={1}
              sx={{
                "& > :not(:last-child)": {
                  borderBottom: 1,
                  borderColor: "divider",
                  pb: 1,
                },
              }}
            >
              {groceries.map((line) => (
                <Box
                  key={`${line.name}-${line.unit ?? ""}-${line.quantity ?? "x"}`}
                >
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {formatAmount(line)}
                    </Box>{" "}
                    {line.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {line.fromRecipes.join(", ")}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
