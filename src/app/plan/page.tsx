import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { WeekPlanner } from "@/components/WeekPlanner";
import { prisma } from "@/lib/db";
import {
  addDays,
  aggregateIngredients,
  getWeekPlan,
  weekStartOf,
} from "@/lib/grocery";
import { listProviders } from "@/lib/shopping";
import { requireUser } from "@/lib/session";

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  await requireUser();

  const params = await searchParams;
  const weekParam = typeof params.week === "string" ? params.week : null;
  const weekStart = weekStartOf(
    weekParam ? new Date(`${weekParam}T00:00:00.000Z`) : new Date(),
  );

  const [meals, recipes] = await Promise.all([
    getWeekPlan(weekStart),
    prisma.recipe.findMany({
      select: { id: true, title: true, servings: true, imageUrl: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const groceries = aggregateIngredients(meals);

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 3 }}>
        This week
      </Typography>
      <WeekPlanner
        weekStartIso={weekStart.toISOString().slice(0, 10)}
        prevWeekIso={addDays(weekStart, -7).toISOString().slice(0, 10)}
        nextWeekIso={addDays(weekStart, 7).toISOString().slice(0, 10)}
        recipes={recipes}
        meals={meals.map((meal) => ({
          date: meal.date.toISOString().slice(0, 10),
          slot: meal.slot,
          recipeId: meal.recipeId,
          servings: meal.servings,
          title: meal.recipe?.title ?? meal.customTitle ?? null,
        }))}
        groceries={groceries}
        providers={listProviders()}
      />
    </AppShell>
  );
}
