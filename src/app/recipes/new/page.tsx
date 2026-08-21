import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { NewRecipeForm } from "@/components/NewRecipeForm";
import { requireUser } from "@/lib/session";

export default async function NewRecipePage() {
  await requireUser();

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 3 }}>
        New recipe
      </Typography>
      <NewRecipeForm />
    </AppShell>
  );
}
