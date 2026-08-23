"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ReviewInput } from "@/lib/review-schema";
import { deleteReview, saveReview } from "@/lib/reviews";
import { requireUser } from "@/lib/session";

import type { ActionResult } from "./actions";

/**
 * Reviewing is open to every signed-in member of the household, on every
 * recipe - the same rule as reading the library. Only the session is checked;
 * ownership of the recipe is deliberately not, or the person who uploaded a
 * dish would be the only one unable to hear what anyone thought of it.
 */

/** The list card and the planner tile both show the average, so both go stale. */
function revalidateRecipe(recipeId: string): void {
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/plan");
}

/** Leave a review, or replace the one you left before. */
export async function saveReviewAction(
  recipeId: string,
  input: ReviewInput,
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await saveReview(recipeId, user.id, input);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "That review did not save.")
          : "That review did not save.",
    };
  }

  revalidateRecipe(recipeId);
  return { ok: true };
}

/**
 * Withdraw your own review.
 *
 * The recipe ID identifies which review to remove and what to revalidate; it is
 * not what authorises the delete. That is the user ID, applied inside the
 * query, so nobody can withdraw someone else's verdict.
 */
export async function deleteReviewAction(
  recipeId: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const removed = await deleteReview(recipeId, user.id);
  if (!removed) {
    return { ok: false, error: "You have not reviewed this recipe." };
  }

  revalidateRecipe(recipeId);
  return { ok: true };
}
