import Typography from "@mui/material/Typography";

import { AppShell } from "@/components/AppShell";
import { UploadWorkflow } from "@/components/UploadWorkflow";
import { requireUser } from "@/lib/session";

export default async function UploadPage() {
  // Upload is for signed-in users only.
  await requireUser();

  return (
    <AppShell>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Upload a recipe card
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        A PDF, or a photograph of a printed or handwritten card. It is read
        automatically, and you get a chance to correct anything before it joins
        the shared library.
      </Typography>
      <UploadWorkflow />
    </AppShell>
  );
}
