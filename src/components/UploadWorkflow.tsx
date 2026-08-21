"use client";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";

import { saveExtractedRecipeAction } from "@/app/upload/actions";
import type { ExtractedRecipe, RecipeInput } from "@/lib/recipe-schema";

import { RecipeForm } from "./RecipeForm";

type Extracted = {
  recipe: ExtractedRecipe;
  pdfUrl: string | null;
  pdfFilename: string | null;
  imageUrl: string | null;
};

const confidenceCopy: Record<ExtractedRecipe["confidence"], string> = {
  high: "Read cleanly. Worth a skim before saving.",
  medium: "Read with some uncertainty — check the amounts.",
  low: "This may not be a recipe, or it read badly. Check every field.",
};

export function UploadWorkflow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      setExtracted(payload as Extracted);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (extracted) {
    const { recipe, ...assets } = extracted;
    const initial: RecipeInput = {
      title: recipe.title,
      description: recipe.description ?? null,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes ?? null,
      cookMinutes: recipe.cookMinutes ?? null,
      sourceUrl: null,
      notes: recipe.notes ?? null,
      instructions: recipe.instructions,
      ingredients: recipe.ingredients,
      tags: recipe.tags,
    };

    return (
      <Stack spacing={3}>
        <Alert severity={recipe.confidence === "low" ? "warning" : "info"}>
          {confidenceCopy[recipe.confidence]}
        </Alert>

        {assets.imageUrl ? (
          <Box
            component="img"
            src={assets.imageUrl}
            alt=""
            sx={{
              width: "100%",
              maxHeight: 280,
              objectFit: "cover",
              borderRadius: 2,
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No usable photo was found in the PDF.
          </Typography>
        )}

        <RecipeForm
          initial={initial}
          submitLabel="Add to the library"
          onSubmit={async (values) => {
            const result = await saveExtractedRecipeAction(values, assets);
            if (result && result.ok === false) return result;
          }}
        />

        <Box>
          <Button onClick={() => setExtracted(null)} disabled={busy}>
            Discard and upload a different PDF
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2} sx={{ alignItems: "center", py: 4 }}>
            <UploadFileIcon fontSize="large" color="disabled" />
            <Typography variant="h3">Choose a recipe PDF</Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Up to 20 MB. Reading it takes a few seconds.
            </Typography>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                // Reset so re-picking the same file fires change again.
                event.target.value = "";
              }}
            />

            <Button
              variant="contained"
              size="large"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Reading the PDF…" : "Select PDF"}
            </Button>

            {busy ? <LinearProgress sx={{ width: "100%" }} /> : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
