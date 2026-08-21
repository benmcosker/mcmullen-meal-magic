import { z } from "zod";

/**
 * One canonical shape for a recipe, used by the create/edit forms, the server
 * actions behind them, and the PDF extractor. Keeping extraction on the same
 * schema means a model that returns something unusable fails validation here
 * rather than reaching the database.
 */
export const ingredientInput = z.object({
  name: z.string().trim().min(1, "Ingredient needs a name").max(200),
  quantity: z
    .number()
    .positive("Quantity must be greater than zero")
    .max(100_000)
    .nullable()
    .optional(),
  unit: z.string().trim().max(50).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

export const recipeInput = z.object({
  title: z.string().trim().min(1, "Give the recipe a title").max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  servings: z.number().int().min(1).max(100).default(4),
  prepMinutes: z.number().int().min(0).max(10_000).nullable().optional(),
  cookMinutes: z.number().int().min(0).max(10_000).nullable().optional(),
  sourceUrl: z
    .url("Must be a valid URL")
    .nullable()
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(5000).nullable().optional(),
  instructions: z.array(z.string().trim().min(1)).max(100).default([]),
  ingredients: z.array(ingredientInput).max(200).default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
});

export type RecipeInput = z.infer<typeof recipeInput>;
export type IngredientInput = z.infer<typeof ingredientInput>;

/** Shape returned by the PDF extractor before a human confirms it. */
export const extractedRecipe = recipeInput.extend({
  /** The model's own confidence that this PDF was a recipe at all. */
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

export type ExtractedRecipe = z.infer<typeof extractedRecipe>;
