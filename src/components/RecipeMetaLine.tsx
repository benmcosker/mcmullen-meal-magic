import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Fragment } from "react";

/**
 * "45 min / Serves 4 / Grill" - what a dish costs you, in one line.
 *
 * The separators are drawn in the rule colour rather than the text colour, so
 * the row reads as three facts with hairlines between them rather than as a
 * sentence with punctuation in it.
 */
export function RecipeMetaLine({
  parts,
  accent,
  dense = false,
}: {
  parts: string[];
  /**
   * The oven temperature, set in clay at the end. Apart from the rest because
   * it is the one number you act on before you start.
   */
  accent?: string | null;
  /** The card version: a shade smaller and tighter than the hero's. */
  dense?: boolean;
}) {
  const items = [...parts, ...(accent ? [accent] : [])];
  if (items.length === 0) return null;

  const accentIndex = accent ? items.length - 1 : -1;

  return (
    <Typography
      variant="body2"
      component="div"
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: dense ? 1.5 : 2.25,
        fontSize: dense ? "0.78rem" : "0.8125rem",
        color: "text.mutedLight",
      }}
    >
      {items.map((item, index) => (
        <Fragment key={`${index}-${item}`}>
          {index > 0 ? (
            // Punctuation, not content: a screen reader announcing "slash"
            // between every fact makes the row harder to listen to, and the
            // gaps already separate them.
            <Box component="span" aria-hidden sx={{ color: "divider" }}>
              /
            </Box>
          ) : null}
          <Box
            component="span"
            sx={
              index === accentIndex
                ? { color: "secondary.main", fontWeight: 600 }
                : undefined
            }
          >
            {item}
          </Box>
        </Fragment>
      ))}
    </Typography>
  );
}
