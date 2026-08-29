/**
 * The one-line summary under a recipe's title: "45 min / Serves 4 / Grill".
 *
 * Structurally typed rather than taking a Prisma recipe, because the search bar
 * and the cards are client components and importing anything that touches
 * Prisma pulls the Postgres driver into the browser bundle - the same reason
 * `recipe-sort.ts` lives apart from `recipes.ts`.
 */

import { formatMinutes } from "./temperature";

export type RecipeMetaSource = {
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  servings?: number | null;
  equipment?: string[] | null;
};

/**
 * The parts that have something to say, in order.
 *
 * Callers join these with a separator, so anything absent has to be dropped
 * here rather than rendered as an empty slot - a row reading "/ Serves 4 /"
 * is how a missing time announces itself, and most recipes are missing
 * something.
 */
export function recipeMetaParts(
  recipe: RecipeMetaSource,
  /**
   * The hero leads on servings and the grid cards lead on time. Both are
   * deliberate: scanning a grid you are asking how long things take, and
   * reading one dish you are asking who it feeds.
   */
  { servingsFirst = false }: { servingsFirst?: boolean } = {},
): string[] {
  const parts: string[] = [];

  const time = formatMinutes(
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0),
  );
  // A recipe serving nobody is a recipe with no servings recorded, not a
  // recipe for nobody.
  const serves =
    recipe.servings != null && recipe.servings > 0
      ? `Serves ${recipe.servings}`
      : null;

  for (const part of servingsFirst ? [serves, time] : [time, serves]) {
    if (part) parts.push(part);
  }

  // Just the first: "Dutch oven, tongs, a probe thermometer" is a packing list,
  // and the line is meant to say how the dish is cooked at a glance.
  const equipment = recipe.equipment?.find((item) => item.trim().length > 0);
  if (equipment) parts.push(equipment.trim());

  return parts;
}

/**
 * A two-part dish name, split so the second half can be set in italic.
 *
 * "Zuni Chicken with Bread Salad" is really a dish and a qualifier, and the
 * design sets the qualifier in Newsreader 300 italic - which is most of what
 * makes a title look like a cookbook rather than a database row. The split is
 * on the first " with ", because that is the joint English puts them at.
 *
 * Anything without one comes back whole: a title is not improved by being cut
 * somewhere it does not divide.
 */
export function splitTitle(title: string): {
  head: string;
  tail: string | null;
} {
  const match = / with /i.exec(title);
  // A title that opens with "With ..." has no first half to set against.
  if (!match || match.index === 0) return { head: title, tail: null };

  return {
    head: title.slice(0, match.index),
    // Keeps the "with" on the italic half, where the design puts it.
    tail: title.slice(match.index + 1),
  };
}

/** Newer than this and a recipe is still worth announcing as an arrival. */
export const RECENT_DAYS = 7;

/**
 * The line above the hero's title.
 *
 * "Added this week" is a claim about the calendar, so it is only made when it
 * is true; otherwise the recipe is simply the newest thing here, which it
 * always is by the time it reaches the hero.
 *
 * The clock is read in here rather than in the component that shows it: an
 * impure call during render is unstable across re-renders, and taking `now` as
 * an argument makes the boundary between "this week" and "not" something a
 * test can stand on either side of.
 */
export function heroEyebrow(createdAt: Date, now: number = Date.now()): string {
  const days = (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return days <= RECENT_DAYS ? "Added this week" : "Latest addition";
}
