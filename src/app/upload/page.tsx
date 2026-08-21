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
        Upload a recipe PDF
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        The PDF is read automatically. You get a chance to correct anything
        before it joins the shared library.
      </Typography>
      <UploadWorkflow />
    </AppShell>
  );
}
