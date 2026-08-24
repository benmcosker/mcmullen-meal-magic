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
  householdId: string,
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
      sourceName: emptyToNull(input.sourceName),
      ovenTemp: input.ovenTemp ?? null,
      ovenTempUnit: input.ovenTempUnit ?? null,
      restMinutes: input.restMinutes ?? null,
      yieldNote: emptyToNull(input.yieldNote),
      equipment: input.equipment,
      notes: emptyToNull(input.notes),
      instructions: input.instructions,
      source: assets.source ?? "MANUAL",
      pdfUrl: assets.pdfUrl ?? null,
      pdfFilename: assets.pdfFilename ?? null,
      pdfSha256: assets.pdfSha256 ?? null,
      imageUrl: assets.imageUrl ?? null,
      householdId,
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
 * Replace a recipe's contents. Returns false if it is not this household's.
 *
 * Ingredients and tags are deleted and recreated rather than diffed: the lists
 * are short, ordering matters, and a diff would have to reconcile renames it
 * has no stable identity for. Wrapped in a transaction so a failure part-way
 * cannot leave a recipe with no ingredients.
 *
 * The ownership check runs inside that transaction rather than before it. A
 * check outside would be a window, however small, in which the recipe could
 * change hands between the answer and the write.
 */
export async function updateRecipe(
  id: string,
  householdId: string,
  input: RecipeInput,
): Promise<boolean> {
  const tagIds = await upsertTags(input.tags);

  return prisma.$transaction(async (tx) => {
    const owned = await tx.recipe.findFirst({
      where: { id, householdId },
      select: { id: true },
    });
    if (!owned) return false;

    await tx.ingredient.deleteMany({ where: { recipeId: id } });
    await tx.recipeTag.deleteMany({ where: { recipeId: id } });
    await tx.recipe.update({
      where: { id },
      data: {
        title: input.title,
        description: emptyToNull(input.description),
        servings: input.servings,
        prepMinutes: input.prepMinutes ?? null,
        cookMinutes: input.cookMinutes ?? null,
        sourceUrl: emptyToNull(input.sourceUrl),
        sourceName: emptyToNull(input.sourceName),
        ovenTemp: input.ovenTemp ?? null,
        ovenTempUnit: input.ovenTempUnit ?? null,
        restMinutes: input.restMinutes ?? null,
        yieldNote: emptyToNull(input.yieldNote),
        equipment: input.equipment,
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
    });

    return true;
  });
}

/**
 * Remove a recipe, if it belongs to this household. Returns whether it did.
 *
 * `deleteMany` rather than `delete` so an id belonging to another family
 * matches nothing instead of erroring - the same answer as an id that was
 * already gone, and one that says nothing about what exists elsewhere.
 */
export async function deleteRecipe(
  id: string,
  householdId: string,
): Promise<boolean> {
  const { count } = await prisma.recipe.deleteMany({
    where: { id, householdId },
  });
  return count > 0;
}

/**
 * Tags with a usage count, for the filter bar.
 *
 * Tag rows themselves stay a shared vocabulary - "Sheet Pan" means the same
 * thing in every kitchen, and a per-household copy of the word buys nothing.
 * The counts are what must be scoped: they are the only part that would
 * otherwise describe another family's library, and a tag used by nobody here
 * drops off the bar entirely.
 */
export async function listTagsWithCounts(
  householdId: string,
): Promise<{ id: string; name: string; slug: string; count: number }[]> {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { recipes: { where: { recipe: { householdId } } } } },
    },
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
