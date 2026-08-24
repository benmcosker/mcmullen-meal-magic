import { prisma } from "./db";
import {
  NO_REVIEWS,
  reviewInput,
  type ReviewInput,
  type ReviewSummary,
  type ReviewWithAuthor,
} from "./review-schema";

/**
 * Averages for a set of recipes, in one query.
 *
 * Computed on read rather than kept in a counter column on the recipe. The
 * library is a household's worth of recipes, not a catalogue, so a grouped
 * aggregate over an indexed column is cheap - and a stored average is a number
 * that can drift out of step with the rows it claims to summarise, which is a
 * worse failure than a slightly slower page.
 */
export async function getReviewSummaries(
  recipeIds: string[],
): Promise<Map<string, ReviewSummary>> {
  const summaries = new Map<string, ReviewSummary>();
  if (recipeIds.length === 0) return summaries;

  const groups = await prisma.recipeReview.groupBy({
    by: ["recipeId"],
    where: { recipeId: { in: recipeIds } },
    _avg: { stars: true },
    _count: { stars: true },
  });

  for (const group of groups) {
    summaries.set(group.recipeId, {
      // Rounded to one place: the difference between 4.33 and 4.3 is noise, and
      // the extra digits imply a precision five opinions do not have.
      average:
        group._avg.stars == null
          ? null
          : Math.round(group._avg.stars * 10) / 10,
      count: group._count.stars,
    });
  }

  return summaries;
}

export async function getReviewSummary(
  recipeId: string,
): Promise<ReviewSummary> {
  const summaries = await getReviewSummaries([recipeId]);
  return summaries.get(recipeId) ?? NO_REVIEWS;
}

/**
 * Newest first.
 *
 * The opposite of a comment thread, and deliberately: reviews are independent
 * verdicts rather than a conversation, and the one written after the most
 * recent attempt is the one worth reading first.
 */
export async function listReviews(
  recipeId: string,
): Promise<ReviewWithAuthor[]> {
  const reviews = await prisma.recipeReview.findMany({
    where: { recipeId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return reviews.map((review) => ({
    id: review.id,
    stars: review.stars,
    body: review.body,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    author: review.user,
  }));
}

/** This person's own review, if they have left one. */
export async function getMyReview(
  recipeId: string,
  userId: string,
): Promise<ReviewWithAuthor | null> {
  const review = await prisma.recipeReview.findUnique({
    where: { recipeId_userId: { recipeId, userId } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!review) return null;

  return {
    id: review.id,
    stars: review.stars,
    body: review.body,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    author: review.user,
  };
}

/**
 * Leave a review, replacing any earlier one from the same person.
 *
 * An upsert rather than a create: changing your mind about a dish you have now
 * cooked three times should move the average, not vote twice.
 *
 * Anyone signed in may review anything in the library, whichever household
 * added it. That is the point of a shared library: an average over one family's
 * three opinions says much less than one over everybody's.
 *
 * The recipe is still checked to exist, because the id arrives from a form post
 * and a review attached to nothing is worse than an error.
 */
export async function saveReview(
  recipeId: string,
  userId: string,
  input: ReviewInput,
): Promise<string> {
  const { stars, body } = reviewInput.parse(input);

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true },
  });
  if (!recipe) throw new Error("No such recipe");

  const review = await prisma.recipeReview.upsert({
    where: { recipeId_userId: { recipeId, userId } },
    create: { recipeId, userId, stars, body },
    update: { stars, body },
    select: { id: true },
  });

  return review.id;
}

/**
 * Withdraw your review, which is different from rating a dish one star.
 *
 * Scoped by userId rather than checked and then deleted: there is no window
 * between the two, and a request for someone else's review removes nothing
 * instead of erroring, which is the same outcome as a review already gone.
 *
 * Returns whether anything was actually removed.
 */
export async function deleteReview(
  recipeId: string,
  userId: string,
): Promise<boolean> {
  const { count } = await prisma.recipeReview.deleteMany({
    where: { recipeId, userId },
  });
  return count > 0;
}
