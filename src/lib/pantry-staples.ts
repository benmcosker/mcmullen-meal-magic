/**
 * The staples a meal-kit recipe assumes you already own.
 *
 * Marley Spoon's pantry list, minus the two categories that are not really
 * staples: "flavour boosters" (Dijon, hot sauce, sherry vinegar) and spice
 * (red pepper flakes, chilli powder). Those are things you buy and run out of,
 * so hiding them from a shopping list would mean discovering the gap mid-recipe.
 *
 * Suggestions, not defaults. Nothing is inserted for you; the pantry page
 * offers these as one-tap additions and every household edits from there.
 */
export const SUGGESTED_PANTRY_STAPLES = [
  "Olive oil",
  "Neutral oil",
  "Coarse salt",
  "Finishing salt",
  "All-purpose flour",
  "Eggs",
  "Freshly ground pepper",
  "Granulated sugar",
] as const;
