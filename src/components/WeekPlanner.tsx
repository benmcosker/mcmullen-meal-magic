"use client";

import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
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

import { ShoppingHandoffPanel } from "./ShoppingHandoffPanel";

const SLOTS: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];
const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};
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
  recipes: { id: string; title: string; servings: number }[];
  meals: PlannedMeal[];
  groceries: GroceryLine[];
  providers: ProviderInfo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const [sendingTo, setSendingTo] = useState<ShoppingProvider | null>(null);

  const byKey = new Map(meals.map((m) => [`${m.date}|${m.slot}`, m]));

  function assign(date: string, slot: MealSlot, recipeId: string) {
    const recipe = recipes.find((r) => r.id === recipeId);
    startTransition(async () => {
      await setPlannedMealAction({
        date,
        slot,
        recipeId: recipeId || null,
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
          return (
            <Grid key={date} size={{ xs: 12, sm: 6, md: 12 / 7 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2">{day}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {date.slice(5)}
                  </Typography>

                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {SLOTS.map((slot) => {
                      const meal = byKey.get(`${date}|${slot}`);
                      return (
                        <TextField
                          key={slot}
                          select
                          size="small"
                          label={SLOT_LABELS[slot]}
                          value={meal?.recipeId ?? ""}
                          disabled={pending}
                          onChange={(e) => assign(date, slot, e.target.value)}
                          fullWidth
                        >
                          <MenuItem value="">
                            <em>Nothing</em>
                          </MenuItem>
                          {recipes.map((recipe) => (
                            <MenuItem key={recipe.id} value={recipe.id}>
                              {recipe.title}
                            </MenuItem>
                          ))}
                        </TextField>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

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
                disabled={sendingTo !== null || groceries.length === 0}
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
