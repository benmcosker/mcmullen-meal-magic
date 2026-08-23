/**
 * The orders the library can be shown in, and their labels.
 *
 * Kept apart from `recipes.ts` for the usual reason: the search bar is a client
 * component, and importing a value from a module that touches Prisma pulls the
 * Postgres driver into the browser bundle. Defined once here so the control and
 * the query can never disagree about what a valid sort is.
 */
export const RECIPE_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "A–Z" },
] as const;

export type RecipeSort = (typeof RECIPE_SORTS)[number]["value"];

export const DEFAULT_SORT: RecipeSort = "newest";

/**
 * Anything unrecognised falls back to the default rather than erroring: the
 * value arrives from a URL, where a stale link or a typo is ordinary.
 */
export function parseSort(value: unknown): RecipeSort {
  return RECIPE_SORTS.some((sort) => sort.value === value)
    ? (value as RecipeSort)
    : DEFAULT_SORT;
}
