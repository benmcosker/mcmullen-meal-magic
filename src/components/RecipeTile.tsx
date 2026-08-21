"use client";

import RestaurantIcon from "@mui/icons-material/Restaurant";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type TileRecipe = {
  id: string;
  title: string;
  imageUrl: string | null;
};

/**
 * A recipe as a picture and a name.
 *
 * Recipes without a photo get a tinted panel rather than a broken frame or a
 * stock image - plenty of recipes arrive without one, and pretending otherwise
 * looks worse than an honest placeholder.
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
        <Box
          sx={{
            width: "100%",
            height,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "action.hover",
            color: "text.disabled",
          }}
        >
          <RestaurantIcon fontSize="small" />
        </Box>
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
    </Box>
  );
}
