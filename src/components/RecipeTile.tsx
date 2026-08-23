"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import type { ReviewSummary } from "@/lib/review-schema";

import { RecipePlaceholder } from "./RecipePlaceholder";
import { ReviewStars } from "./ReviewStars";

export type TileRecipe = {
  id: string;
  title: string;
  imageUrl: string | null;
  /** Optional so a tile can be shown before review scores have been loaded. */
  reviews?: ReviewSummary;
};

/**
 * A recipe as a picture and a name.
 *
 * Recipes without a photo get the shared placeholder rather than a broken
 * frame or a stock image - plenty arrive without one, and pretending otherwise
 * looks worse than admitting it.
 */
export function RecipeTile({
  recipe,
  height = 96,
}: {
  recipe: TileRecipe;
  height?: number;
}) {
  return (
    <Box sx={{ width: "100%" }}>
      {recipe.imageUrl ? (
        <Box
          component="img"
          src={recipe.imageUrl}
          alt=""
          sx={{
            width: "100%",
            height,
            objectFit: "cover",
            borderRadius: 1,
            display: "block",
          }}
        />
      ) : (
        <RecipePlaceholder
          seed={recipe.id}
          title={recipe.title}
          height={height}
        />
      )}

      <Typography
        variant="body2"
        sx={{
          mt: 0.75,
          fontWeight: 600,
          lineHeight: 1.25,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {recipe.title}
      </Typography>

      {/*
       * The count is left off here. A tile is narrow, and when you are picking
       * what to cook the score is the useful half - the sample size is one
       * click away on the recipe itself.
       */}
      {recipe.reviews ? (
        <Box sx={{ mt: 0.25 }}>
          <ReviewStars summary={recipe.reviews} showCount={false} />
        </Box>
      ) : null}
    </Box>
  );
}
