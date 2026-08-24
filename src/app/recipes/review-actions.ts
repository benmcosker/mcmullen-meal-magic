"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ReviewInput } from "@/lib/review-schema";
import { deleteReview, saveReview } from "@/lib/reviews";
import { requireHousehold } from "@/lib/session";

import type { ActionResult } from "./actions";

/**
 * Reviewing is open to every member of the household, on every recipe in it -
 * the same rule as reading the library. Who uploaded the dish is deliberately
 * not checked, or that person would be the only one unable to hear what
 * anybody thought of it. The household is checked, in `saveReview`, because
 * the recipe id arrives from the client.
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
  const user = await requireHousehold();

  try {
    await saveReview(recipeId, user.householdId, user.id, input);
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
  const user = await requireHousehold();

  const removed = await deleteReview(recipeId, user.id);
  if (!removed) {
    return { ok: false, error: "You have not reviewed this recipe." };
  }

  revalidateRecipe(recipeId);
  return { ok: true };
}
