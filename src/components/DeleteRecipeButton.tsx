"use client";

import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";

import { deleteRecipeAction } from "@/app/recipes/actions";

/**
 * Deleting is shared and irreversible, so it asks first.
 *
 * Two shapes, one dialog. The recipe page has room for a labelled button; a
 * library card does not, and gets an icon. Sharing the component rather than
 * writing a second one keeps the confirmation - and its wording about what
 * else this destroys - identical wherever you delete from.
 */
export function DeleteRecipeButton({
  id,
  title,
  compact = false,
}: {
  id: string;
  title: string;
  /** Icon only, for tight spaces like a card corner. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      {compact ? (
        <Tooltip title={`Delete ${title}`}>
          <IconButton
            size="small"
            color="error"
            aria-label={`Delete ${title}`}
            onClick={() => setOpen(true)}
            // Reads on a dish photo as well as on a plain card.
            sx={{
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": { bgcolor: "background.paper" },
            }}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => setOpen(true)}
        >
          Delete
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Delete “{title}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes it for everyone, and any planned meals using it lose
            their recipe. It cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await deleteRecipeAction(id);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
