"use client";

import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RECIPE_SORTS, type RecipeSort } from "@/lib/recipe-sort";
import { useEffect, useState } from "react";

type TagOption = { name: string; slug: string; count: number };

/**
 * Search state lives in the URL so a filtered view can be linked and survives
 * a reload. Typing is debounced to avoid a query per keystroke.
 */
export function RecipeSearchBar({ tags }: { tags: TagOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTags = searchParams.getAll("tag");
  const sort = (searchParams.get("sort") ?? "newest") as RecipeSort;
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (query === current) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, pathname, router, searchParams]);

  function setSort(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    // The default stays out of the URL, so a plain /recipes link is the
    // ordinary view rather than a view someone happened to configure.
    if (next === "newest") params.delete("sort");
    else params.set("sort", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

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
    <Stack spacing={2} sx={{ mb: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes, ingredients, tags…"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          select
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          sx={{ minWidth: { sm: 190 } }}
        >
          {RECIPE_SORTS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {tags.length > 0 ? (
        /*
         * One scrolling row on a phone, wrapped everywhere else.
         *
         * A dozen tags wrap to four rows on a narrow screen and push the first
         * recipe off the bottom - the filter ends up costing more space than
         * the thing it filters. Sideways they stay reachable without taking
         * the screen.
         */
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: { xs: "nowrap", sm: "wrap" },
            overflowX: { xs: "auto", sm: "visible" },
            // Room for the chips' focus ring, which the overflow would clip.
            py: 0.5,
            mx: { xs: -0.5, sm: 0 },
            px: { xs: 0.5, sm: 0 },
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            "& > *": { flexShrink: 0 },
          }}
        >
          {tags.map((tag) => (
            <Chip
              key={tag.slug}
              label={`${tag.name} (${tag.count})`}
              onClick={() => toggleTag(tag.slug)}
              color={activeTags.includes(tag.slug) ? "primary" : "default"}
              variant={activeTags.includes(tag.slug) ? "filled" : "outlined"}
              size="small"
            />
          ))}
        </Box>
      ) : null}
    </Stack>
  );
}
