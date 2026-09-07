"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setRecipeSharedAction } from "@/app/recipes/share-actions";

/**
 * Whether this household's recipe is visible to the others.
 *
 * A sentence and a button rather than a switch: the two states have different
 * consequences and neither is a setting you flick past. What it says is what
 * is true now; what the button says is what pressing it would do.
 */
export function ShareRecipeToggle({
  recipeId,
  isShared,
}: {
  recipeId: string;
  isShared: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setRecipeSharedAction(recipeId, !isShared);
      router.refresh();
    });
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        mt: 3,
        pt: 2,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
        {isShared
          ? "Shared - every household can cook from this."
          : "Private to your household."}
      </Typography>
      <Button size="small" disabled={pending} onClick={toggle}>
        {isShared ? "Make it private" : "Share it"}
      </Button>
    </Box>
  );
}
