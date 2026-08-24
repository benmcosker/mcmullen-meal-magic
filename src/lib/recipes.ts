import { Prisma } from "@/generated/prisma/client";

import { prisma } from "./db";
import { DEFAULT_SORT, type RecipeSort } from "./recipe-sort";
import { NO_REVIEWS, type ReviewSummary } from "./review-schema";
import { getReviewSummaries } from "./reviews";

export type RecipeSearchHit = {
  id: string;
  rank: number;
};

export type RecipeSearchOptions = {
  /**
   * Whose library to search. Required, and threaded into every branch below:
   * this is the isolation mechanism, not a filter someone can forget and get
   * away with.
   */
  householdId: string;
  /** Free-text query. Empty or whitespace-only returns the newest recipes. */
  query?: string;
  /** Tag slugs. A recipe must carry every slug listed to match. */
  tagSlugs?: string[];
  /**
   * Defaults to newest, which defers to relevance when there is also a search
   * query: a search for "lemon" answering with the least relevant match simply
   * because it was added most recently would be a worse search. Any other
   * choice is authoritative.
   */
  sort?: RecipeSort;
  limit?: number;
  offset?: number;
};

/**
 * Search recipe IDs, ranked.
 *
 * Two matching strategies run together, because either alone leaves obvious
 * gaps:
 *
 * - Full-text against the trigger-maintained `search_vector`. Handles word
 *   stemming and multi-word queries, and gives us ranking.
 * - Case-insensitive substring, via the pg_trgm indexes. Full-text alone misses
 *   partial words and near-misses the English stemmer treats as distinct - a
 *   search for "lemon" does not match a recipe described as "lemony", because
 *   those stem to `lemon` and `lemoni`. Substring matching catches it.
 *
 * Ingredients and tags live in other tables, so they are matched with EXISTS
 * subqueries rather than being folded into the recipe's own vector.
 *
 * Returned as IDs rather than rows: ranking needs raw SQL, but the caller wants
 * a fully-hydrated Prisma object, so it re-fetches by ID and re-applies order.
 */
export async function searchRecipeIds(
  options: RecipeSearchOptions,
): Promise<RecipeSearchHit[]> {
  const query = options.query?.trim() ?? "";
  const sort = options.sort ?? DEFAULT_SORT;
  const tagSlugs = options.tagSlugs?.filter(Boolean) ?? [];

  // Only "highest rated" needs the review aggregate, so the join is paid for
  // only when it is asked for.
  const ratingJoin =
    sort === "rating"
      ? Prisma.sql`
          LEFT JOIN (
            SELECT "recipeId",
                   AVG("stars")::float8 AS avg_stars,
                   COUNT(*)::int AS review_count
            FROM "recipe_review"
            GROUP BY "recipeId"
          ) rr ON rr."recipeId" = r."id"
        `
      : Prisma.empty;

  const orderBy = {
    newest: Prisma.sql`r."createdAt" DESC`,
    oldest: Prisma.sql`r."createdAt" ASC`,
    // Rounded to the same one place the card shows, so two recipes both
    // reading "4.3" are a genuine tie rather than being separated by a digit
    // nobody can see. Ties then go to the recipe more people have rated -
    // four fives is a stronger four-and-a-half than one is. Unrated recipes
    // sort last: Postgres would otherwise lead with them, NULL being "greater
    // than" everything in a DESC order.
    rating: Prisma.sql`round(rr.avg_stars::numeric, 1) DESC NULLS LAST, rr.review_count DESC, r."createdAt" DESC`,
    // Case-insensitive, or "apple crumble" sorts after "Zabaglione".
    title: Prisma.sql`lower(r."title") ASC`,
  }[sort];
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = Math.max(options.offset ?? 0, 0);

  // Escape LIKE wildcards so a user typing "100%" searches for that literally.
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const tagFilter =
    tagSlugs.length > 0
      ? Prisma.sql`
          AND (
            SELECT COUNT(DISTINCT t."slug")
            FROM "recipe_tag" rt
            JOIN "tag" t ON t."id" = rt."tagId"
            WHERE rt."recipeId" = r."id" AND t."slug" IN (${Prisma.join(tagSlugs)})
          ) = ${tagSlugs.length}
        `
      : Prisma.empty;

  if (query === "") {
    return prisma.$queryRaw<RecipeSearchHit[]>(Prisma.sql`
      SELECT r."id", 0::float8 AS rank
      FROM "recipe" r
      ${ratingJoin}
      WHERE r."householdId" = ${options.householdId} ${tagFilter}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `);
  }

  return prisma.$queryRaw<RecipeSearchHit[]>(Prisma.sql`
    SELECT
      r."id",
      ts_rank(r."search_vector", websearch_to_tsquery('english', ${query}))::float8 AS rank
    FROM "recipe" r
    ${ratingJoin}
    WHERE r."householdId" = ${options.householdId}
    AND (
      r."search_vector" @@ websearch_to_tsquery('english', ${query})
      OR r."title" ILIKE ${like}
      OR r."description" ILIKE ${like}
      OR EXISTS (
        SELECT 1 FROM "ingredient" i
        WHERE i."recipeId" = r."id"
          AND (
            to_tsvector('english', i."name") @@ websearch_to_tsquery('english', ${query})
            OR i."name" ILIKE ${like}
          )
      )
      OR EXISTS (
        SELECT 1 FROM "recipe_tag" rt
        JOIN "tag" t ON t."id" = rt."tagId"
        WHERE rt."recipeId" = r."id" AND t."name" ILIKE ${like}
      )
    )
    ${tagFilter}
    ORDER BY ${
      // Relevance leads only for the default order. Someone who has explicitly
      // asked for oldest or A-Z means it, search or no search.
      sort === DEFAULT_SORT ? Prisma.sql`rank DESC, ${orderBy}` : orderBy
    }
    LIMIT ${limit} OFFSET ${offset}
  `);
}

const recipeInclude = {
  ingredients: { orderBy: { position: "asc" } },
  tags: { include: { tag: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { reviews: true } },
} satisfies Prisma.RecipeInclude;

/**
 * The review average rides along with every recipe the app loads.
 *
 * Prisma cannot average a relation inside an `include`, so it is a second
 * query stitched on here rather than at each call site - otherwise every new
 * page that shows a recipe has to remember to fetch it, and the one that
 * forgets shows an unreviewed dish.
 */
export type RecipeWithRelations = Prisma.RecipeGetPayload<{
  include: typeof recipeInclude;
}> & { reviews: ReviewSummary };

async function withReviewSummaries<T extends { id: string }>(
  recipes: T[],
): Promise<(T & { reviews: ReviewSummary })[]> {
  const summaries = await getReviewSummaries(recipes.map((r) => r.id));
  return recipes.map((recipe) => ({
    ...recipe,
    reviews: summaries.get(recipe.id) ?? NO_REVIEWS,
  }));
}

/** Search and hydrate in one call, preserving rank order. */
export async function searchRecipes(
  options: RecipeSearchOptions,
): Promise<RecipeWithRelations[]> {
  const hits = await searchRecipeIds(options);
  if (hits.length === 0) return [];

  const ids = hits.map((h) => h.id);
  const recipes = await withReviewSummaries(
    await prisma.recipe.findMany({
      // The household is already in the query above, so this is redundant -
      // deliberately. It is the cheapest possible second barrier on the one
      // query that decides what a family can see, and it costs nothing: the
      // ids are indexed and already narrowed.
      where: { id: { in: ids }, householdId: options.householdId },
      include: recipeInclude,
    }),
  );

  // `IN (...)` does not preserve order, so restore the ranking from the search.
  const byId = new Map(recipes.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is RecipeWithRelations => r !== undefined);
}

/**
 * One recipe, if it belongs to the asking household.
 *
 * The id comes off a URL, so the household goes in the where clause rather
 * than being checked afterwards: another family's recipe is not found, which
 * is the same answer as a recipe that does not exist. Nothing about it leaks,
 * not even that it is there.
 */
export async function getRecipe(
  id: string,
  householdId: string,
): Promise<RecipeWithRelations | null> {
  const recipe = await prisma.recipe.findFirst({
    where: { id, householdId },
    include: recipeInclude,
  });
  if (!recipe) return null;

  const [withSummary] = await withReviewSummaries([recipe]);
  return withSummary;
}

/** Turn free-text tag names into Tag rows, reusing any that already exist. */
export async function upsertTags(names: string[]): Promise<string[]> {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  const tags = await Promise.all(
    cleaned.map((name) => {
      const slug = slugifyTag(name);
      return prisma.tag.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
      });
    }),
  );

  return tags.map((t) => t.id);
}

export function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
