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
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  discardUploadAction,
  saveExtractedRecipeAction,
} from "@/app/upload/actions";
import type { ExtractedRecipe, RecipeInput } from "@/lib/recipe-schema";

import { RecipeForm } from "./RecipeForm";

/** A little beyond the server's own 60s ceiling. */
const UPLOAD_TIMEOUT_MS = 70_000;

type ExistingRecipe = { id: string; title: string };

type Extracted = {
  recipe: ExtractedRecipe;
  pdfUrl: string | null;
  pdfFilename: string | null;
  pdfSha256: string | null;
  imageUrl: string | null;
  /** Recipes already in the library whose titles look like this one. */
  similar: ExistingRecipe[];
};

const confidenceCopy: Record<ExtractedRecipe["confidence"], string> = {
  high: "Read cleanly. Worth a skim before saving.",
  medium: "Read with some uncertainty — check the amounts.",
  low: "This may not be a recipe, or it read badly. Check every field.",
};

export function UploadWorkflow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<ExistingRecipe | null>(null);

  // Reading a PDF takes tens of seconds. Without a counter there is no way to
  // tell a slow extraction from a wedged one, and people re-submit.
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [busy]);

  async function handleFile(file: File) {
    setBusy(true);
    setElapsed(0);
    setError(null);
    setDuplicateOf(null);

    const body = new FormData();
    body.append("file", file);

    // Slightly beyond the server's own ceiling, so a server-side timeout
    // reports its own error rather than being masked by this one. Without any
    // limit a wedged request spins indefinitely with no way out but a reload.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      // An error page from a proxy or a platform timeout is not JSON, and
      // parsing it would throw a syntax error that says nothing useful.
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // 409 carries the recipe it matched, so the message can link to it
        // instead of leaving someone to search for it.
        if (payload?.duplicateOf) setDuplicateOf(payload.duplicateOf);
        // The server names its own failures. Only guess when it could not -
        // and then guess nothing: claiming a cause we do not know sends people
        // looking in the wrong place.
        setError(
          payload?.error ??
            `Upload failed (${response.status}). Nothing was saved.`,
        );
        return;
      }

      setExtracted(payload as Extracted);
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "AbortError"
          ? "That PDF took too long to read. Try a shorter one, or add the recipe by hand."
          : "Upload failed. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timeout);
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
      restMinutes: recipe.restMinutes ?? null,
      ovenTemp: recipe.ovenTemp ?? null,
      ovenTempUnit: recipe.ovenTempUnit ?? null,
      yieldNote: recipe.yieldNote ?? null,
      equipment: recipe.equipment,
      sourceUrl: null,
      sourceName: recipe.sourceName ?? null,
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

        {extracted.similar.length > 0 ? (
          <Alert severity="warning">
            The library already has{" "}
            {extracted.similar.map((match, index) => (
              <span key={match.id}>
                {index > 0 ? ", " : ""}
                <Link href={`/recipes/${match.id}`}>{match.title}</Link>
              </span>
            ))}
            . This is a different file, so it may be a better copy of the same
            dish — or a different recipe that happens to share a name. Saving
            adds it alongside.
          </Alert>
        ) : null}

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
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              // Remove the stored PDF and photo: nothing will reference them
              // once this draft is gone.
              await discardUploadAction(assets);
              setExtracted(null);
              setBusy(false);
            }}
          >
            Discard and upload a different PDF
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {error ? (
        <Alert severity={duplicateOf ? "info" : "error"}>
          {error}
          {duplicateOf ? (
            <>
              {" "}
              <Link href={`/recipes/${duplicateOf.id}`}>Open it</Link>, or pick
              a different PDF.
            </>
          ) : null}
        </Alert>
      ) : null}

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
              {busy
                ? elapsed > 0
                  ? `Reading the PDF… ${elapsed}s`
                  : "Reading the PDF…"
                : "Select PDF"}
            </Button>

            {busy ? <LinearProgress sx={{ width: "100%" }} /> : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
