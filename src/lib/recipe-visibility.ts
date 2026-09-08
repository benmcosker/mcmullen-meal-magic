import { Prisma } from "@/generated/prisma/client";

/**
 * Which recipes a household may read.
 *
 * Its own, and anything another household has shared. Written once and used by
 * every read, because "who can see this" is the kind of rule that is right in
 * four places and forgotten in the fifth - and the fifth is the one that shows
 * somebody another family's dinner.
 *
 * Sharing is not per household pair: a shared recipe is shared with everyone.
 * See the schema comment on `Recipe.isShared` for why, and for what would have
 * to change if that stops being true.
 */
export function visibleRecipes(householdId: string): Prisma.RecipeWhereInput {
  return { OR: [{ householdId }, { isShared: true }] };
}

/**
 * The same rule as SQL, for the search query.
 *
 * Search ranks in raw SQL because Prisma cannot, so the predicate has to exist
 * twice. Both live in this file so the pair can be read at once and changed
 * together; `r` is the alias the search gives the recipe table.
 */
export function visibleRecipesSql(householdId: string): Prisma.Sql {
  return Prisma.sql`(r."householdId" = ${householdId} OR r."isShared")`;
}

/** Whether this household may read a recipe it has already loaded. */
export function canRead(
  recipe: { householdId: string; isShared: boolean },
  householdId: string,
): boolean {
  return recipe.householdId === householdId || recipe.isShared;
}

/** Whether this household may change or delete it. Owners only, shared or not. */
export function canEdit(
  recipe: { householdId: string },
  householdId: string,
): boolean {
  return recipe.householdId === householdId;
}
