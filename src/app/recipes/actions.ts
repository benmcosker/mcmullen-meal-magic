"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createRecipe,
  deleteRecipe,
  updateRecipe,
} from "@/lib/recipe-mutations";
import { recipeInput, type RecipeInput } from "@/lib/recipe-schema";
import { requireHousehold } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Every mutation re-checks the session server-side. The UI hides these controls
 * from signed-out visitors, but that is presentation, not enforcement.
 */
export async function saveRecipeAction(
  raw: unknown,
  existingId?: string,
): Promise<ActionResult> {
  const user = await requireHousehold();

  const parsed = recipeInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid recipe",
    };
  }

  const input: RecipeInput = parsed.data;

  let id: string;
  if (existingId) {
    const updated = await updateRecipe(existingId, user.householdId, input);
    if (!updated) {
      return { ok: false, error: "That recipe is not in your library." };
    }
    id = existingId;
  } else {
    id = await createRecipe(input, user.householdId, user.id);
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  redirect(`/recipes/${id}`);
}

export async function deleteRecipeAction(id: string): Promise<void> {
  const { householdId } = await requireHousehold();
  await deleteRecipe(id, householdId);
  revalidatePath("/recipes");
  redirect("/recipes");
}
