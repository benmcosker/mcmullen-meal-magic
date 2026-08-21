"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createRecipe } from "@/lib/recipe-mutations";
import { recipeInput } from "@/lib/recipe-schema";
import { requireUser } from "@/lib/session";

export type SaveExtractedResult = { ok: false; error: string };

/**
 * Save a recipe the uploader has reviewed.
 *
 * The extracted fields arrive from the client, so they are re-validated here -
 * the review screen is a convenience, not a trust boundary.
 */
export async function saveExtractedRecipeAction(
  raw: unknown,
  assets: {
    pdfUrl?: string | null;
    pdfFilename?: string | null;
    imageUrl?: string | null;
  },
): Promise<SaveExtractedResult> {
  const user = await requireUser();

  const parsed = recipeInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid recipe",
    };
  }

  const id = await createRecipe(parsed.data, user.id, {
    source: "PDF",
    pdfUrl: assets.pdfUrl ?? null,
    pdfFilename: assets.pdfFilename ?? null,
    imageUrl: assets.imageUrl ?? null,
  });

  revalidatePath("/recipes");
  redirect(`/recipes/${id}`);
}
