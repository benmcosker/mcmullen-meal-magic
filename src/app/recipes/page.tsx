import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { LinkButton } from "@/components/LinkButton";
import { ReviewStars } from "@/components/ReviewStars";
import { RecipeSearchBar } from "@/components/RecipeSearchBar";
import { listTagsWithCounts } from "@/lib/recipe-mutations";
import { searchRecipes } from "@/lib/recipes";
import { requireUser } from "@/lib/session";

export default async function RecipesPage({
  searchParams,
}: PageProps<"/recipes">) {
  await requireUser();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const tagParam = params.tag;
  const tagSlugs = Array.isArray(tagParam)
    ? tagParam
    : typeof tagParam === "string"
      ? [tagParam]
      : [];

  const [recipes, tags] = await Promise.all([
    searchRecipes({ query, tagSlugs }),
    listTagsWithCounts(),
  ]);

  return (
    <AppShell>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h1">Recipes</Typography>
        <LinkButton
          href="/recipes/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          New recipe
        </LinkButton>
      </Stack>

      <RecipeSearchBar tags={tags} />

      {recipes.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              {query || tagSlugs.length > 0
                ? "Nothing matches that search."
                : "No recipes yet. Add one, or upload a PDF."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {recipes.map((recipe) => (
            <Grid key={recipe.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: "100%", position: "relative" }}>
                {/*
                 * A sibling of the Link, not a child of it. The whole card is
                 * a link, and a button inside an anchor is invalid markup
                 * whose clicks get taken by the navigation.
                 */}
                <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
                  <DeleteRecipeButton
                    id={recipe.id}
                    title={recipe.title}
                    compact
                  />
                </Box>
                <Link
                  href={`/recipes/${recipe.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    height: "100%",
                  }}
                >
                  {recipe.imageUrl ? (
                    <CardMedia
                      component="img"
                      image={recipe.imageUrl}
                      alt=""
                      sx={{ height: 160, objectFit: "cover" }}
                    />
                  ) : null}
                  <CardContent>
                    <Typography variant="h3" gutterBottom>
                      {recipe.title}
                    </Typography>
                    {recipe.description ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {recipe.description}
                      </Typography>
                    ) : null}
                    <Box sx={{ mt: 1.5 }}>
                      <ReviewStars summary={recipe.reviews} />
                    </Box>

                    <Stack
                      direction="row"
                      sx={{ flexWrap: "wrap", gap: 0.5, mt: 1.5 }}
                    >
                      {recipe.tags.map(({ tag }) => (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Link>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </AppShell>
  );
}
