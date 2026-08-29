/**
 * The handful of tags that get a name on the recipes page.
 *
 * The library's full vocabulary runs to dozens of tags, and showing all of them
 * as a wall of chips meant the first recipe started below the fold. These six
 * are the ones worth naming - the questions people actually arrive with - and
 * the rest live behind the Filters control, which is where you go when you know
 * what you are looking for.
 *
 * Curated rather than computed: the six most-used tags would be whatever the
 * library happens to be heavy on this month, which is not the same as the six
 * most useful ways in.
 */
export const COLLECTION_SLUGS = [
  "weeknight",
  "sunday-cooking",
  "grill",
  "pasta",
  "one-pot",
  "comfort",
] as const;

/** Six fits on one line at 1440px without wrapping. */
export const MAX_COLLECTIONS = 6;

export type TagCount = { name: string; slug: string; count: number };

/**
 * The collections to show, best-effort.
 *
 * A curated list is a guess about somebody else's library, and a library that
 * happens to use none of these six words would get an empty row - worse than
 * the wall of chips this replaces, because it offers nothing at all. So the
 * curated slugs come first, in their designed order, and any shortfall is made
 * up from the busiest tags the library does have.
 *
 * Tags with no recipes never appear: `listTagsWithCounts` already drops them,
 * and a collection leading to an empty page is worse than one fewer collection.
 */
export function pickCollections(
  tags: TagCount[],
  limit: number = MAX_COLLECTIONS,
): TagCount[] {
  if (limit <= 0) return [];

  const bySlug = new Map(
    tags.filter((t) => t.count > 0).map((t) => [t.slug, t]),
  );

  const picked: TagCount[] = [];
  for (const slug of COLLECTION_SLUGS) {
    const tag = bySlug.get(slug);
    if (tag) picked.push(tag);
    if (picked.length === limit) return picked;
  }

  const taken = new Set(picked.map((t) => t.slug));
  const rest = [...bySlug.values()]
    .filter((t) => !taken.has(t.slug))
    // Busiest first, and alphabetical within a tie so the row does not
    // reshuffle itself between two requests that return the same counts.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return [...picked, ...rest.slice(0, limit - picked.length)];
}
