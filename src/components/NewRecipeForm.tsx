"use client";

import { saveRecipeAction } from "@/app/recipes/actions";
import type { RecipeInput } from "@/lib/recipe-schema";

import { RecipeForm } from "./RecipeForm";

const blank: RecipeInput = {
  title: "",
  description: null,
  servings: 4,
  prepMinutes: null,
  cookMinutes: null,
  sourceUrl: null,
  notes: null,
  instructions: [],
  ingredients: [],
  tags: [],
};

export function NewRecipeForm({ initial }: { initial?: RecipeInput }) {
  return (
    <RecipeForm
      initial={initial ?? blank}
      submitLabel="Save recipe"
      onSubmit={async (values) => {
        const result = await saveRecipeAction(values);
        if (result && result.ok === false) return result;
      }}
    />
  );
}
