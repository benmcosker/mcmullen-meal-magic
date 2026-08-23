"use client";

import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * The longest edge a dish photo needs.
 *
 * The largest place one is shown is 380px tall, so this is already generous for
 * a high-density screen. Downscaling in the browser rather than on the server
 * means a 6 MB phone photo leaves as a few hundred kilobytes: faster on a phone
 * connection, and comfortably inside the request size limits of a serverless
 * function, which a modern camera file is not.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export function RecipeImageUploader({
  recipeId,
  hasImage,
}: {
  recipeId: string;
  hasImage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: FormData) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/recipe-image", {
        method: "POST",
        body,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "That did not work. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(file: File) {
    const body = new FormData();
    body.set("recipeId", recipeId);

    try {
      body.set("file", await downscale(file));
    } catch {
      // Anything the browser cannot decode - a HEIC on a non-Safari browser,
      // a file that is not really an image - falls through to the server,
      // which identifies it by its bytes and says so properly.
      body.set("file", file);
    }

    await send(body);
  }

  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Working…" : hasImage ? "Replace photo" : "Add a photo"}
        </Button>

        {hasImage ? (
          <Button
            size="small"
            color="inherit"
            startIcon={<DeleteOutlinedIcon />}
            disabled={busy}
            onClick={() => {
              const body = new FormData();
              body.set("recipeId", recipeId);
              body.set("remove", "true");
              void send(body);
            }}
          >
            Remove
          </Button>
        ) : null}
      </Stack>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = "";
          if (file) void onPick(file);
        }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}

/**
 * Shrink to `MAX_EDGE` and re-encode as JPEG.
 *
 * Goes through the browser's own decoder, so whatever it can display it can
 * upload - including HEIC on Safari, which arrives as an ordinary JPEG on the
 * other side. Images already small enough are still re-encoded, which strips
 * the EXIF a phone attaches: a dish photo does not need to carry the GPS
 * coordinates of the kitchen it was taken in.
 */
async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2d context");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Could not encode");

  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
