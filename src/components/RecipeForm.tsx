"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";

import type { RecipeInput } from "@/lib/recipe-schema";

export type RecipeFormValues = RecipeInput;

type Row = { name: string; quantity: string; unit: string; note: string };

function toRows(ingredients: RecipeInput["ingredients"]): Row[] {
  if (ingredients.length === 0)
    return [{ name: "", quantity: "", unit: "", note: "" }];
  return ingredients.map((i) => ({
    name: i.name,
    quantity: i.quantity == null ? "" : String(i.quantity),
    unit: i.unit ?? "",
    note: i.note ?? "",
  }));
}

export function RecipeForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: RecipeFormValues;
  submitLabel: string;
  onSubmit: (
    values: RecipeFormValues,
  ) => Promise<{ ok: false; error: string } | void>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [servings, setServings] = useState(String(initial.servings ?? 4));
  const [prepMinutes, setPrepMinutes] = useState(
    initial.prepMinutes == null ? "" : String(initial.prepMinutes),
  );
  const [cookMinutes, setCookMinutes] = useState(
    initial.cookMinutes == null ? "" : String(initial.cookMinutes),
  );
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [rows, setRows] = useState<Row[]>(toRows(initial.ingredients));
  const [steps, setSteps] = useState<string[]>(
    initial.instructions.length > 0 ? initial.instructions : [""],
  );
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    if (!tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTags([...tags, value]);
    }
    setTagDraft("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const values: RecipeFormValues = {
      title,
      description: description || null,
      servings: Number(servings) || 4,
      prepMinutes: prepMinutes === "" ? null : Number(prepMinutes),
      cookMinutes: cookMinutes === "" ? null : Number(cookMinutes),
      sourceUrl: sourceUrl || null,
      notes: notes || null,
      instructions: steps.map((s) => s.trim()).filter(Boolean),
      ingredients: rows
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          quantity: r.quantity === "" ? null : Number(r.quantity),
          unit: r.unit || null,
          note: r.note || null,
        })),
      tags,
    };

    const result = await onSubmit(values);
    if (result && result.ok === false) {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={3}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Servings"
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Prep (min)"
                  type="number"
                  value={prepMinutes}
                  onChange={(e) => setPrepMinutes(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Cook (min)"
                  type="number"
                  value={cookMinutes}
                  onChange={(e) => setCookMinutes(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  label="Source URL"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h3" gutterBottom>
            Ingredients
          </Typography>
          <Stack spacing={1.5}>
            {rows.map((row, index) => (
              <Stack
                key={index}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <TextField
                  label="Qty"
                  value={row.quantity}
                  onChange={(e) =>
                    updateRow(index, { quantity: e.target.value })
                  }
                  sx={{ width: 90 }}
                />
                <TextField
                  label="Unit"
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                  sx={{ width: 110 }}
                />
                <TextField
                  label="Ingredient"
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  fullWidth
                />
                <IconButton
                  aria-label={`Remove ingredient ${index + 1}`}
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  disabled={rows.length === 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            ))}
            <Box>
              <Button
                startIcon={<AddIcon />}
                onClick={() =>
                  setRows([
                    ...rows,
                    { name: "", quantity: "", unit: "", note: "" },
                  ])
                }
              >
                Add ingredient
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h3" gutterBottom>
            Method
          </Typography>
          <Stack spacing={1.5}>
            {steps.map((step, index) => (
              <Stack
                key={index}
                direction="row"
                spacing={1}
                sx={{ alignItems: "flex-start" }}
              >
                <Typography
                  sx={{ pt: 1.5, minWidth: 24 }}
                  color="text.secondary"
                >
                  {index + 1}.
                </Typography>
                <TextField
                  value={step}
                  onChange={(e) =>
                    setSteps(
                      steps.map((s, i) => (i === index ? e.target.value : s)),
                    )
                  }
                  multiline
                  fullWidth
                />
                <IconButton
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() => setSteps(steps.filter((_, i) => i !== index))}
                  disabled={steps.length === 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            ))}
            <Box>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setSteps([...steps, ""])}
              >
                Add step
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h3" gutterBottom>
            Tags
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}
          >
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => setTags(tags.filter((t) => t !== tag))}
              />
            ))}
            {tags.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No tags yet.
              </Typography>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Add a tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button onClick={addTag}>Add</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </CardContent>
      </Card>

      <Box>
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </Box>
    </Stack>
  );

  function updateRow(index: number, patch: Partial<Row>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
}
