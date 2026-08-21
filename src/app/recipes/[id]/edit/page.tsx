import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { EditRecipeForm } from "@/components/EditRecipeForm";
import { getRecipe } from "@/lib/recipes";
import { requireUser } from "@/lib/session";

export default async function EditRecipePage({
  params,
}: PageProps<"/recipes/[id]/edit">) {
  await requireUser();

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Edit recipe
      </Typography>
      <EditRecipeForm
        id={recipe.id}
        initial={{
          title: recipe.title,
          description: recipe.description,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          sourceUrl: recipe.sourceUrl,
          notes: recipe.notes,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            note: i.note,
          })),
          tags: recipe.tags.map(({ tag }) => tag.name),
        }}
      />
    </AppShell>
  );
}
