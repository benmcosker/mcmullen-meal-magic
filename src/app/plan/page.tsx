import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { WeekPlanner } from "@/components/WeekPlanner";
import { prisma } from "@/lib/db";
import {
  addDays,
  aggregateIngredients,
  getSkipsForWeek,
  getWeekPlan,
  toSkipSet,
  weekStartOf,
} from "@/lib/grocery";
import { NO_REVIEWS } from "@/lib/review-schema";
import { getReviewSummaries } from "@/lib/reviews";
import { listProviders } from "@/lib/shopping";
import { requireUser } from "@/lib/session";

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  await requireUser();

  const params = await searchParams;
  const weekParam = typeof params.week === "string" ? params.week : null;
  const weekStart = weekStartOf(
    weekParam ? new Date(`${weekParam}T00:00:00.000Z`) : new Date(),
  );

  const [meals, recipes, skips] = await Promise.all([
    getWeekPlan(weekStart),
    prisma.recipe.findMany({
      select: { id: true, title: true, servings: true, imageUrl: true },
      orderBy: { title: "asc" },
    }),
    getSkipsForWeek(weekStart),
  ]);

  // Review scores on the picker tiles: choosing dinner is exactly when it helps
  // to see which of these the household actually liked.
  const summaries = await getReviewSummaries(recipes.map((r) => r.id));

  const groceries = aggregateIngredients(meals, toSkipSet(skips));

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 3 }}>
        This week
      </Typography>
      <WeekPlanner
        weekStartIso={weekStart.toISOString().slice(0, 10)}
        prevWeekIso={addDays(weekStart, -7).toISOString().slice(0, 10)}
        nextWeekIso={addDays(weekStart, 7).toISOString().slice(0, 10)}
        recipes={recipes.map((recipe) => ({
          ...recipe,
          reviews: summaries.get(recipe.id) ?? NO_REVIEWS,
        }))}
        meals={meals.map((meal) => ({
          date: meal.date.toISOString().slice(0, 10),
          slot: meal.slot,
          recipeId: meal.recipeId,
          servings: meal.servings,
          title: meal.recipe?.title ?? meal.customTitle ?? null,
        }))}
        groceries={groceries}
        skips={skips}
        providers={listProviders()}
      />
    </AppShell>
  );
}
