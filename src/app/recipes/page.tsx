import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { LinkButton } from "@/components/LinkButton";
import { ReviewStars } from "@/components/ReviewStars";
import { RecipePhoto } from "@/components/RecipePhoto";
import { RecipePlaceholder } from "@/components/RecipePlaceholder";
import { RecipeSearchBar } from "@/components/RecipeSearchBar";
import { listTagsWithCounts } from "@/lib/recipe-mutations";
import { parseSort } from "@/lib/recipe-sort";
import { searchRecipes } from "@/lib/recipes";
import { requireHousehold } from "@/lib/session";

/** Enough to characterise a dish; more than this and the card is all labels. */
const MAX_TAGS_ON_CARD = 3;

export default async function RecipesPage({
  searchParams,
}: PageProps<"/recipes">) {
  const { householdId } = await requireHousehold();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const tagParam = params.tag;
  const tagSlugs = Array.isArray(tagParam)
    ? tagParam
    : typeof tagParam === "string"
      ? [tagParam]
      : [];

  const sort = parseSort(params.sort);

  const [recipes, tags] = await Promise.all([
    searchRecipes({ householdId, query, tagSlugs, sort }),
    listTagsWithCounts(householdId),
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
                {/*
                 * A row on a phone, a tile everywhere else.
                 *
                 * Stacked vertically, one card ran to nearly 400px and barely
                 * one and a half fitted on a phone screen - scrolling a
                 * library of any size became a chore, and the photo was doing
                 * most of the eating. Beside the text instead of above it, the
                 * picture still identifies the dish while five or six recipes
                 * fit where one used to.
                 */}
                <Link
                  href={`/recipes/${recipe.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    height: "100%",
                  }}
                >
                  {/*
                   * The flex lives on a Box inside the anchor, not on the
                   * anchor itself via `component={Link}`. That prop hands MUI
                   * a component function, and a function cannot cross from a
                   * server component into a client one - the same boundary
                   * that LinkButton exists for.
                   */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "row", sm: "column" },
                      height: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        // Fixed beside the text, full width above it.
                        width: { xs: 116, sm: "100%" },
                        flexShrink: 0,
                      }}
                    >
                      {recipe.imageUrl ? (
                        // One card per row on a phone, two on a tablet, three on
                        // a desktop. The last value is a fixed width, not a
                        // fraction: the page sits in a 1200px container, so past
                        // that the card stops growing and a vw figure would keep
                        // asking for larger files that are never drawn.
                        <RecipePhoto
                          src={recipe.imageUrl}
                          height={{ xs: 116, sm: 160 }}
                          rounded={0}
                          sizes="(max-width: 600px) 116px, (max-width: 900px) 50vw, (max-width: 1200px) 32vw, 380px"
                        />
                      ) : (
                        // Not omitted: a card with no image is shorter than its
                        // neighbours, and a grid of mismatched heights reads as
                        // broken rather than as "this one has no photo".
                        <RecipePlaceholder
                          seed={recipe.id}
                          title={recipe.title}
                          height={{ xs: 116, sm: 160 }}
                          showTitle
                        />
                      )}
                    </Box>

                    <CardContent
                      sx={{
                        flexGrow: 1,
                        // Without this a long title refuses to wrap and pushes
                        // the row wider than the card.
                        minWidth: 0,
                        py: { xs: 1.25, sm: 2 },
                        // Room for the delete button in the corner.
                        pr: { xs: 5, sm: 2 },
                      }}
                    >
                      <Typography
                        variant="h3"
                        gutterBottom
                        sx={{
                          // Two lines, so cards keep to a rhythm rather than
                          // each finding its own height.
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {recipe.title}
                      </Typography>
                      {recipe.description ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            // Out of the way on a phone: at this width it is the
                            // difference between four recipes on screen and two,
                            // and the title already says what the dish is.
                            display: { xs: "none", sm: "-webkit-box" },
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {recipe.description}
                        </Typography>
                      ) : null}
                      <Box sx={{ mt: { xs: 0.5, sm: 1.5 } }}>
                        <ReviewStars summary={recipe.reviews} />
                      </Box>

                      {/*
                       * Capped rather than complete. Five tags wrap to three
                       * rows on a narrow card and push everything below them
                       * off the screen; the rest are on the recipe, and the
                       * filter bar above is the way to search by them anyway.
                       */}
                      <Stack
                        direction="row"
                        sx={{
                          flexWrap: "wrap",
                          gap: 0.5,
                          mt: { xs: 0.75, sm: 1.5 },
                        }}
                      >
                        {recipe.tags
                          .slice(0, MAX_TAGS_ON_CARD)
                          .map(({ tag }) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        {recipe.tags.length > MAX_TAGS_ON_CARD ? (
                          <Chip
                            label={`+${recipe.tags.length - MAX_TAGS_ON_CARD}`}
                            size="small"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Box>
                </Link>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </AppShell>
  );
}
