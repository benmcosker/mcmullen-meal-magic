import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { formatQuantity } from "@/lib/quantity";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { IconChip } from "@/components/IconChip";
import { LinkButton } from "@/components/LinkButton";
import { RecipeImageUploader } from "@/components/RecipeImageUploader";
import { RecipePhoto } from "@/components/RecipePhoto";
import { RecipePlaceholder } from "@/components/RecipePlaceholder";
import { RecipeReviews } from "@/components/RecipeReviews";
import { ReviewStars } from "@/components/ReviewStars";
import { getMyReview, listReviews } from "@/lib/reviews";
import { formatMinutes, formatOvenTemp } from "@/lib/temperature";
import { getRecipe } from "@/lib/recipes";
import { requireHousehold } from "@/lib/session";

function formatAmount(quantity: number | null, unit: string | null): string {
  // No rounding: String already gives "2" for 2.0 and keeps 0.25 intact.
  if (quantity == null) return unit ?? "";
  // Shown as it was typed: a half stays "1/2" rather than becoming "0.5",
  // which is the same number and not how a recipe reads.
  const amount = formatQuantity(quantity);
  return unit ? `${amount} ${unit}` : amount;
}

export default async function RecipePage({
  params,
}: PageProps<"/recipes/[id]">) {
  const user = await requireHousehold();

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const [reviews, myReview] = await Promise.all([
    listReviews(recipe.id),
    getMyReview(recipe.id, user.id),
  ]);

  const mine = recipe.householdId === user.householdId;
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const ovenTemp = formatOvenTemp(recipe.ovenTemp, recipe.ovenTempUnit);
  const restTime = formatMinutes(recipe.restMinutes);

  return (
    <AppShell>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 1,
        }}
      >
        {/*
         * The title gets the whole width on a phone and the buttons drop
         * below it. Sharing the row costs it about half the line, which a
         * page label like "Pantry" can afford and a recipe title cannot.
         */}
        <Typography
          variant="h1"
          sx={{
            /*
             * Every other h1 is a page label the theme's 3rem step-down was
             * measured against. This one is whatever the card was called, so
             * it steps down once more rather than running to six lines.
             */
            fontSize: { xs: "2.125rem", sm: "4.75rem" },
            overflowWrap: "break-word",
          }}
        >
          {recipe.title}
        </Typography>
        {/*
         * Everyone reads the library; only the household that added a recipe
         * can change it. The server enforces that either way.
         *
         * Absent rather than disabled for the other households. A greyed-out
         * Delete says only "not you", where the line at the foot of the page
         * names the family it does belong to - which is the actual answer, and
         * worth reading whether or not you were reaching for the button.
         */}
        {mine ? (
          <Stack direction="row" spacing={1}>
            <LinkButton
              href={`/recipes/${recipe.id}/edit`}
              startIcon={<EditIcon />}
              variant="outlined"
            >
              Edit
            </LinkButton>
            <DeleteRecipeButton id={recipe.id} title={recipe.title} />
          </Stack>
        ) : null}
      </Stack>

      {recipe.description ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {recipe.description}
        </Typography>
      ) : null}

      <Box sx={{ mb: 2 }}>
        <ReviewStars summary={recipe.reviews} />
      </Box>

      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}>
        <Chip
          label={recipe.yieldNote ?? `Serves ${recipe.servings}`}
          size="small"
        />
        {totalMinutes > 0 ? (
          <Chip label={`${formatMinutes(totalMinutes)} total`} size="small" />
        ) : null}
        {restTime ? <Chip label={`${restTime} resting`} size="small" /> : null}
        {/*
         * Coloured, unlike the rest: the oven has to be on before anything
         * else happens, so it is the one number worth finding without reading.
         */}
        {ovenTemp ? (
          <IconChip icon="oven" label={ovenTemp} size="small" color="warning" />
        ) : null}
        {recipe.tags.map(({ tag }) => (
          <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
        ))}
        {recipe.sourceFileUrl ? (
          <IconChip
            icon={recipe.sourceFileType === "application/pdf" ? "pdf" : "photo"}
            component="a"
            href={recipe.sourceFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            clickable
            label={recipe.sourceFileName ?? "Original card"}
            size="small"
            variant="outlined"
          />
        ) : null}
      </Stack>

      <Box sx={{ mb: 3 }}>
        {recipe.imageUrl ? (
          // The one photo already on screen when the page opens, so it loads
          // eagerly; everything else on the site stays lazy.
          <RecipePhoto
            src={recipe.imageUrl}
            height={{ xs: 200, sm: 380 }}
            rounded={2}
            priority
            sizes="(max-width: 1200px) 100vw, 1152px"
          />
        ) : (
          <RecipePlaceholder
            title={recipe.title}
            height={{ xs: 160, sm: 220 }}
            showTitle
          />
        )}

        {/*
         * Directly under the image it changes, rather than in the edit form.
         * The moment you want a photo is the moment you are looking at the
         * placeholder, and a recipe has to exist before it can have one.
         *
         * The photo follows the recipe: only the household that added it can
         * change the picture everybody else cooks from.
         */}
        {mine ? (
          <Box sx={{ mt: 1 }}>
            <RecipeImageUploader
              recipeId={recipe.id}
              hasImage={Boolean(recipe.imageUrl)}
            />
          </Box>
        ) : null}
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Ingredients
              </Typography>
              {/*
               * Separators are CSS borders rather than Stack's `divider`
               * prop: that prop clones the divider element for each gap, and
               * React.cloneElement on a client-component element inside a
               * server component produces an element with no type, which
               * fails at request time. It only bites with two or more
               * children, so a one-item list would have looked fine.
               */}
              <Stack
                spacing={1}
                sx={{
                  "& > :not(:last-child)": {
                    borderBottom: 1,
                    borderColor: "divider",
                    pb: 1,
                  },
                }}
              >
                {recipe.ingredients.map((ingredient) => (
                  <Box key={ingredient.id}>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {formatAmount(ingredient.quantity, ingredient.unit)}
                      </Box>{" "}
                      {ingredient.name}
                    </Typography>
                    {ingredient.note ? (
                      <Typography variant="caption" color="text.secondary">
                        {ingredient.note}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
                {recipe.ingredients.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None listed.
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              {recipe.equipment.length > 0 ? (
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="h3" gutterBottom>
                    You will need
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                    {recipe.equipment.map((item) => (
                      <IconChip
                        key={item}
                        icon="equipment"
                        label={item}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}

              <Typography variant="h3" gutterBottom>
                Method
              </Typography>
              <Stack spacing={2} component="ol" sx={{ pl: 3, m: 0 }}>
                {recipe.instructions.map((step, index) => (
                  <Typography key={index} component="li" variant="body1">
                    {step}
                  </Typography>
                ))}
              </Stack>
              {recipe.instructions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No method recorded.
                </Typography>
              ) : null}

              {recipe.notes ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h3" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recipe.notes}
                  </Typography>
                </>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <RecipeReviews
            recipeId={recipe.id}
            summary={recipe.reviews}
            reviews={reviews}
            myReview={myReview}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 3 }}
      >
        Added by {recipe.createdBy.name}
        {mine ? null : <> of {recipe.household.name}</>}
        {recipe.sourceName ? <> · From {recipe.sourceName}</> : null}
        {recipe.sourceUrl ? (
          <>
            {" · "}
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Original source
            </a>
          </>
        ) : null}
      </Typography>
    </AppShell>
  );
}
