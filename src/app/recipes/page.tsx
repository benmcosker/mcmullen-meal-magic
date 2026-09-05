import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { CollectionsRow } from "@/components/CollectionsRow";
import { LinkButton } from "@/components/LinkButton";
import { RecipeFilters } from "@/components/RecipeFilters";
import { RecipeGridCard } from "@/components/RecipeGridCard";
import { RecipeHero } from "@/components/RecipeHero";
import { RecipeSearchBar } from "@/components/RecipeSearchBar";
import { pickCollections } from "@/lib/collections";
import { withArticle } from "@/lib/household";
import { listTagsWithCounts } from "@/lib/recipe-mutations";
import { parseSort } from "@/lib/recipe-sort";
import { countRecipes, searchRecipes } from "@/lib/recipes";
import { requireHousehold } from "@/lib/session";

export default async function RecipesPage({
  searchParams,
}: PageProps<"/recipes">) {
  const { householdName } = await requireHousehold();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const tagParam = params.tag;
  const tagSlugs = Array.isArray(tagParam)
    ? tagParam
    : typeof tagParam === "string"
      ? [tagParam]
      : [];

  const sort = parseSort(params.sort);

  const [recipes, tags, libraryCount] = await Promise.all([
    searchRecipes({ query, tagSlugs, sort }),
    listTagsWithCounts(),
    countRecipes(),
  ]);

  // The hero is the front page arguing for one recipe. Once you have searched
  // or picked a collection, the newest match is not news - it is just the first
  // result. Re-ordering is a request to see the library in that order, not to
  // have one recipe lifted out of it.
  const browsing = !query && tagSlugs.length === 0 && sort === "newest";
  const hero = browsing && recipes.length > 0 ? recipes[0] : null;
  const grid = hero ? recipes.slice(1) : recipes;

  return (
    <AppShell>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", md: "flex-end" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          // On a phone the title and the controls stack, and a 32px gap
          // between them was buying nothing but scrolling: the whole header
          // ran to 500px on an 852px screen before a single dish appeared.
          gap: { xs: 1.5, md: 4 },
          mb: { xs: "20px", md: "36px" },
        }}
      >
        <Box>
          <Typography
            variant="overline"
            component="p"
            sx={{ color: "secondary.main", mb: "12px" }}
          >
            {/*
             * The viewer's household, even though the library is shared by all
             * of them: it is the box they keep it in, and "the shared recipe
             * box" belongs to nobody.
             */}
            {withArticle(householdName)} recipe box · {libraryCount}{" "}
            {libraryCount === 1 ? "dish" : "dishes"}
          </Typography>
          <Typography variant="h1">Recipes</Typography>
        </Box>

        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            // Filters and New recipe share the row width on a phone rather
            // than huddling at the left with a hole beside them.
            justifyContent: { xs: "space-between", md: "flex-start" },
            width: { xs: "100%", md: "auto" },
            gap: "18px",
            pb: { xs: 0, md: "8px" },
          }}
        >
          <RecipeFilters tags={tags} />
          <LinkButton href="/recipes/new" variant="contained" color="ink">
            New recipe
          </LinkButton>
        </Stack>
      </Box>

      <RecipeSearchBar />

      <CollectionsRow collections={pickCollections(tags)} />

      {recipes.length === 0 ? (
        <Typography variant="body1" sx={{ color: "text.muted" }}>
          {query || tagSlugs.length > 0
            ? "Nothing matches that search."
            : "No recipes yet. Add one, or upload a PDF."}
        </Typography>
      ) : (
        <>
          {hero ? <RecipeHero recipe={hero} /> : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              // 44px between rows against 40px between columns: the extra
              // height stops a title reading as the caption of the photo below.
              gap: "44px 40px",
              pt: hero ? "44px" : 0,
            }}
          >
            {grid.map((recipe) => (
              <RecipeGridCard key={recipe.id} recipe={recipe} />
            ))}
          </Box>
        </>
      )}
    </AppShell>
  );
}
