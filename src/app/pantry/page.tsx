import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { PantryManager } from "@/components/PantryManager";
import { listPantryItems } from "@/lib/pantry";
import { requireUser } from "@/lib/session";

export default async function PantryPage() {
  await requireUser();

  const items = await listPantryItems();

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Pantry
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Things you always have in. These never reach the weekly shopping list,
        however many recipes call for them.
      </Typography>

      <Card>
        <CardContent>
          <PantryManager items={items} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
