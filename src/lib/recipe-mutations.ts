import { prisma } from "./db";
import type { RecipeInput } from "./recipe-schema";
import { upsertTags } from "./recipes";

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type RecipeAssets = {
  pdfUrl?: string | null;
  pdfFilename?: string | null;
  /** Lets a re-upload of the same file be recognised. Null for manual entry. */
  pdfSha256?: string | null;
  imageUrl?: string | null;
  source?: "MANUAL" | "PDF";
};

export async function createRecipe(
  input: RecipeInput,
  createdById: string,
  assets: RecipeAssets = {},
): Promise<string> {
  const tagIds = await upsertTags(input.tags);

  const recipe = await prisma.recipe.create({
    data: {
      title: input.title,
      description: emptyToNull(input.description),
      servings: input.servings,
      prepMinutes: input.prepMinutes ?? null,
      cookMinutes: input.cookMinutes ?? null,
      sourceUrl: emptyToNull(input.sourceUrl),
      notes: emptyToNull(input.notes),
      instructions: input.instructions,
      source: assets.source ?? "MANUAL",
      pdfUrl: assets.pdfUrl ?? null,
      pdfFilename: assets.pdfFilename ?? null,
      pdfSha256: assets.pdfSha256 ?? null,
      imageUrl: assets.imageUrl ?? null,
      createdById,
      ingredients: {
        create: input.ingredients.map((ingredient, position) => ({
          name: ingredient.name,
          quantity: ingredient.quantity ?? null,
          unit: emptyToNull(ingredient.unit),
          note: emptyToNull(ingredient.note),
          position,
        })),
      },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
  });

  return recipe.id;
}

/**
 * Replace a recipe's contents.
 *
 * Ingredients and tags are deleted and recreated rather than diffed: the lists
 * are short, ordering matters, and a diff would have to reconcile renames it
 * has no stable identity for. Wrapped in a transaction so a failure part-way
 * cannot leave a recipe with no ingredients.
 */
export async function updateRecipe(
  id: string,
  input: RecipeInput,
): Promise<void> {
  const tagIds = await upsertTags(input.tags);

  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipeId: id } }),
    prisma.recipeTag.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.update({
      where: { id },
      data: {
        title: input.title,
        description: emptyToNull(input.description),
        servings: input.servings,
        prepMinutes: input.prepMinutes ?? null,
        cookMinutes: input.cookMinutes ?? null,
        sourceUrl: emptyToNull(input.sourceUrl),
        notes: emptyToNull(input.notes),
        instructions: input.instructions,
        ingredients: {
          create: input.ingredients.map((ingredient, position) => ({
            name: ingredient.name,
            quantity: ingredient.quantity ?? null,
            unit: emptyToNull(ingredient.unit),
            note: emptyToNull(ingredient.note),
            position,
          })),
        },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ]);
}

export async function deleteRecipe(id: string): Promise<void> {
  await prisma.recipe.delete({ where: { id } });
}

/** Tags with a usage count, for the filter bar. */
export async function listTagsWithCounts(): Promise<
  { id: string; name: string; slug: string; count: number }[]
> {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { recipes: true } } },
    orderBy: { name: "asc" },
  });

  return tags
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      count: tag._count.recipes,
    }))
    .filter((tag) => tag.count > 0);
}
