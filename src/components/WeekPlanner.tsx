"use client";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SmsIcon from "@mui/icons-material/Sms";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import CardActionArea from "@mui/material/CardActionArea";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  sendWeekToProviderAction,
  setPlannedMealAction,
  textShoppingListAction,
  type TextListActionResult,
} from "@/app/plan/actions";
import type { MealSlot, ShoppingProvider } from "@/generated/prisma/enums";
import { groupBySection } from "@/lib/grocery-sections";
import type { GroceryLine, WeeklySkipRecord } from "@/lib/grocery";
import type { HandoffResult, ProviderInfo } from "@/lib/shopping";

import { addToPantryAction, skipForWeekAction } from "@/app/plan/skip-actions";

import { RecipePickerDialog } from "./RecipePickerDialog";
import { RecipeTile, type TileRecipe } from "./RecipeTile";
import { ShoppingHandoffPanel } from "./ShoppingHandoffPanel";
import type { PantryItemRecord } from "@/lib/pantry";

import { ExcludedIngredients } from "./ExcludedIngredients";

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
  skips,
  pantry,
  providers,
  smsAudience,
}: {
  weekStartIso: string;
  prevWeekIso: string;
  nextWeekIso: string;
  recipes: (TileRecipe & { servings: number })[];
  meals: PlannedMeal[];
  groceries: GroceryLine[];
  skips: WeeklySkipRecord[];
  pantry: PantryItemRecord[];
  providers: ProviderInfo[];
  /** Null when texting is not configured on this deployment. */
  smsAudience: { names: string[]; withoutNumbers: string[] } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [picking, setPicking] = useState<{ date: string; day: string } | null>(
    null,
  );
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const [sendingTo, setSendingTo] = useState<ShoppingProvider | null>(null);
  const [texting, setTexting] = useState(false);
  const [textResult, setTextResult] = useState<TextListActionResult | null>(
    null,
  );

  async function textList() {
    setTexting(true);
    setTextResult(null);
    setTextResult(await textShoppingListAction(weekStartIso));
    setTexting(false);
  }

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

  function gotItThisWeek(name: string) {
    startTransition(async () => {
      await skipForWeekAction(name, weekStartIso);
      router.refresh();
    });
  }

  function alwaysHave(name: string) {
    startTransition(async () => {
      await addToPantryAction(name);
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
                    sx={{
                      alignItems: "baseline",
                      gap: 0.75,
                      mb: 1.25,
                      minHeight: 28,
                    }}
                  >
                    {/*
                     * "Wed" on a phone, "Wednesday" from a tablet up. A
                     * half-width tile carrying a date and two icon buttons
                     * leaves the day name about seventy pixels, which turns
                     * "Wednesday" into "Wed…" - the same three letters, plus
                     * an ellipsis implying something was lost. Rendered as two
                     * spans rather than a media-query hook because this is a
                     * server-rendered page and useMediaQuery guesses wrong on
                     * the first paint.
                     */}
                    <Typography variant="subtitle2" noWrap>
                      <Box
                        component="span"
                        sx={{ display: { xs: "none", sm: "inline" } }}
                      >
                        {day}
                      </Box>
                      <Box
                        component="span"
                        sx={{ display: { xs: "inline", sm: "none" } }}
                      >
                        {day.slice(0, 3)}
                      </Box>
                    </Typography>
                    {/*
                     * Both refuse to wrap: two icon buttons in the header of a
                     * half-width tile leave the date about forty pixels, and a
                     * date broken across two lines ("08-" above "24") makes the
                     * tile taller than its neighbour for no reason. The day
                     * name is the one that gives, since it is the part still
                     * readable when clipped.
                     */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {date.slice(5)}
                    </Typography>
                    {/*
                     * Opening the recipe and clearing the day both live in the
                     * header rather than on the tile. The tile is a
                     * CardActionArea that opens the picker, and an anchor or a
                     * button nested inside a button is invalid markup that
                     * swallows the click - which is also why the recipe title
                     * itself cannot be the link, tempting as that is.
                     */}
                    {planned ? (
                      <Stack
                        direction="row"
                        sx={{ ml: "auto", alignSelf: "center" }}
                      >
                        <Tooltip title={`Open ${planned.title}`}>
                          <IconButton
                            size="small"
                            component={Link}
                            href={`/recipes/${planned.id}`}
                            aria-label={`Open the recipe for ${planned.title}`}
                            sx={{ p: 0.5 }}
                          >
                            <MenuBookIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={`Remove ${planned.title}`}>
                          <IconButton
                            size="small"
                            aria-label={`Remove ${planned.title} from ${day}`}
                            disabled={pending}
                            onClick={() => assign(date, null)}
                            sx={{ p: 0.5 }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : null}
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

            {smsAudience ? (
              <Button
                variant="outlined"
                startIcon={<SmsIcon />}
                disabled={
                  texting ||
                  groceries.length === 0 ||
                  smsAudience.names.length === 0
                }
                onClick={textList}
              >
                {texting ? "Sending\u2026" : "Text the list"}
              </Button>
            ) : null}
          </Stack>

          {smsAudience ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.5 }}
            >
              {smsAudience.names.length === 0
                ? "Nobody has a phone number saved yet — add one on the household page."
                : `Texts ${smsAudience.names.join(" and ")}.`}
              {smsAudience.withoutNumbers.length > 0
                ? ` ${smsAudience.withoutNumbers.join(" and ")} has no number saved.`
                : ""}
            </Typography>
          ) : null}

          {textResult ? (
            <Alert
              severity={textResult.ok ? "success" : "error"}
              sx={{ mb: 2 }}
              onClose={() => setTextResult(null)}
            >
              {textResult.ok ? textResult.message : textResult.error}
            </Alert>
          ) : null}

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
            <Stack spacing={2.5}>
              {groupBySection(groceries).map((section) => (
                <Box key={section.id}>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: "block", mb: 0.5 }}
                  >
                    {section.label}
                  </Typography>

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
                    {section.items.map((line) => (
                      <Box
                        key={`${line.name}-${line.unit ?? ""}-${line.quantity ?? "x"}`}
                        // Stable handle for the row. MUI's generated class names and
                        // nesting shift between versions, and tests that walk that
                        // structure silently target the wrong row rather than fail.
                        data-ingredient={line.name.trim().toLowerCase()}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1,
                          // Controls stay out of the way until the row is
                          // approached. Forty rows each showing two buttons is
                          // harder to read than the list being trimmed - but on
                          // touch there is no hover, so they are always visible
                          // below md.
                          "&:hover .row-actions, & .row-actions:focus-within": {
                            opacity: 1,
                          },
                        }}
                      >
                        <Box sx={{ flexGrow: 1 }}>
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

                        <Stack
                          direction="row"
                          spacing={0.5}
                          className="row-actions"
                          sx={{
                            opacity: { xs: 1, md: 0 },
                            transition: "opacity 120ms",
                            flexShrink: 0,
                          }}
                        >
                          <Button
                            size="small"
                            disabled={pending}
                            onClick={() => gotItThisWeek(line.name)}
                          >
                            Got it
                          </Button>
                          <Button
                            size="small"
                            disabled={pending}
                            onClick={() => alwaysHave(line.name)}
                          >
                            Always have
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <ExcludedIngredients pantry={pantry} skips={skips} />
        </CardContent>
      </Card>
    </Stack>
  );
}
