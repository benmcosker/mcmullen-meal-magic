"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { TagCount } from "@/lib/collections";

/**
 * The six named ways into the library.
 *
 * Set in the same serif as the dishes rather than as controls, because that is
 * what they are: an editor's shelf labels, not a filter widget. They write the
 * same `?tag=` the chips always did, so a collection is a linkable view and the
 * back button undoes it.
 */
export function CollectionsRow({ collections }: { collections: TagCount[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (collections.length === 0) return null;

  const activeTags = searchParams.getAll("tag");

  function toggleTag(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    const next = activeTags.includes(slug)
      ? activeTags.filter((t) => t !== slug)
      : [...activeTags, slug];

    params.delete("tag");
    for (const tag of next) params.append("tag", tag);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "26px",
        mb: "56px",
        // Six serif words do not fit across a phone. Scrolling the row keeps
        // them on one line, where wrapping would spend three lines on shelf
        // labels; the cut-off item is the affordance.
        overflowX: { xs: "auto", md: "visible" },
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        "& > *": { flexShrink: 0 },
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        Collections
      </Typography>

      {collections.map((collection) => {
        const active = activeTags.includes(collection.slug);
        return (
          <ButtonBase
            key={collection.slug}
            onClick={() => toggleTag(collection.slug)}
            aria-pressed={active}
            sx={{
              fontFamily: (theme) => theme.typography.body1.fontFamily,
              fontSize: "1.1875rem",
              color: "text.primary",
              borderBottom: "1px solid",
              // Selection is the rule going dark, which is the only signal the
              // row can carry without growing a second row of state.
              borderColor: active ? "text.primary" : "divider",
              pb: "2px",
              gap: "6px",
              alignItems: "baseline",
              "&:hover": { borderColor: "text.primary" },
            }}
          >
            {collection.name}
            <Box
              component="span"
              sx={{
                fontFamily: (theme) => theme.typography.body2.fontFamily,
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                color: "text.disabled",
              }}
            >
              {collection.count}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
