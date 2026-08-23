import RestaurantIcon from "@mui/icons-material/Restaurant";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/**
 * What a recipe looks like before it has a photo.
 *
 * Plenty of recipes arrive without one - typed in by hand, or from a PDF with
 * no usable image - and an honest placeholder beats a broken frame or a stock
 * photo of someone else's dinner. It also keeps a grid of cards the same
 * height, which is most of why this exists.
 *
 * No directive of its own, so it renders on the server inside the recipe pages
 * and gets bundled with the client where a client component uses it.
 */

/**
 * A stable hue per recipe.
 *
 * Deliberately derived from the recipe's own id rather than picked at random:
 * the same dish keeps the same colour on every page and across reloads, so the
 * tile you are looking for stays recognisable in a grid. Any change to the
 * recipe leaves it alone, because the id never changes.
 */
function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // Skips the 55-90 band, where the tints go the colour of an unwell salad.
  const hue = hash % 325;
  return hue < 55 ? hue : hue + 35;
}

export function RecipePlaceholder({
  seed,
  title,
  height,
  showTitle = false,
}: {
  /** Anything stable per recipe; the id is ideal. */
  seed: string;
  title: string;
  height: number | { xs: number; sm?: number; md?: number };
  /** Adds the dish's initials, for placeholders large enough to carry them. */
  showTitle?: boolean;
}) {
  const hue = hueFor(seed);

  return (
    <Box
      // Decorative. The title is always beside or below this in real text, so
      // announcing it here would just repeat the recipe's name.
      aria-hidden
      sx={{
        width: "100%",
        height,
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.75,
        // Two stops of the same hue rather than a flat fill: a large flat
        // rectangle reads as a failed image, a gradient reads as a choice.
        // Low saturation and alpha so it sits behind the text in either
        // theme rather than competing with it.
        background: `linear-gradient(135deg,
          hsl(${hue} 55% 55% / 0.20),
          hsl(${(hue + 40) % 360} 55% 55% / 0.09))`,
        color: `hsl(${hue} 45% 45%)`,
        // The same hue is too dark to read on a dark background, so lift it.
        "@media (prefers-color-scheme: dark)": {
          color: `hsl(${hue} 45% 72%)`,
        },
      }}
    >
      <RestaurantIcon fontSize={showTitle ? "large" : "small"} />
      {showTitle ? (
        <Typography
          variant="h3"
          sx={{ letterSpacing: 1, opacity: 0.85, fontWeight: 700 }}
        >
          {initials(title)}
        </Typography>
      ) : null}
    </Box>
  );
}

/** "Chicken Piccata" becomes "CP". Two letters is all that fits and all that helps. */
function initials(title: string): string {
  const words = title
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
