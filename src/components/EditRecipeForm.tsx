"use client";

import { saveRecipeAction } from "@/app/recipes/actions";
import type { RecipeInput } from "@/lib/recipe-schema";

import { RecipeForm } from "./RecipeForm";

export function EditRecipeForm({
  id,
  initial,
}: {
  id: string;
  initial: RecipeInput;
}) {
  return (
    <RecipeForm
      initial={initial}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        const result = await saveRecipeAction(values, id);
        if (result && result.ok === false) return result;
      }}
    />
  );
}
