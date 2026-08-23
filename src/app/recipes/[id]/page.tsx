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
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { IconChip } from "@/components/IconChip";
import { LinkButton } from "@/components/LinkButton";
import { RecipeReviews } from "@/components/RecipeReviews";
import { ReviewStars } from "@/components/ReviewStars";
import { getMyReview, listReviews } from "@/lib/reviews";
import { formatMinutes, formatOvenTemp } from "@/lib/temperature";
import { getRecipe } from "@/lib/recipes";
import { requireUser } from "@/lib/session";

function formatQuantity(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? "";
  // Trim trailing zeros so 2.00 reads as 2 but 0.25 survives intact.
  const amount = Number.isInteger(quantity)
    ? String(quantity)
    : String(quantity);
  return unit ? `${amount} ${unit}` : amount;
}

export default async function RecipePage({
  params,
}: PageProps<"/recipes/[id]">) {
  const user = await requireUser();

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const [reviews, myReview] = await Promise.all([
    listReviews(recipe.id),
    getMyReview(recipe.id, user.id),
  ]);

  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const ovenTemp = formatOvenTemp(recipe.ovenTemp, recipe.ovenTempUnit);
  const restTime = formatMinutes(recipe.restMinutes);

  return (
    <AppShell>
      <Stack
        direction="row"
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="h1">{recipe.title}</Typography>
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
        {recipe.pdfUrl ? (
          <IconChip
            icon="pdf"
            component="a"
            href={recipe.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            clickable
            label={recipe.pdfFilename ?? "Original PDF"}
            size="small"
            variant="outlined"
          />
        ) : null}
      </Stack>

      {recipe.imageUrl ? (
        <Box
          component="img"
          src={recipe.imageUrl}
          alt=""
          sx={{
            width: "100%",
            maxHeight: 380,
            objectFit: "cover",
            borderRadius: 2,
            mb: 3,
          }}
        />
      ) : null}

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
                        {formatQuantity(ingredient.quantity, ingredient.unit)}
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
