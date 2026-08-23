import Box from "@mui/material/Box";
import Rating from "@mui/material/Rating";
import Typography from "@mui/material/Typography";

import { MAX_STARS, type ReviewSummary } from "@/lib/review-schema";

/**
 * The household's verdict, read-only.
 *
 * No directive of its own, so it renders on the server inside the recipe pages
 * and gets bundled with the client where a client component uses it.
 *
 * An unreviewed recipe says so in words rather than showing five empty stars:
 * a row of grey stars reads as "everyone hated this" at a glance, which is the
 * opposite of what no data means.
 */
export function ReviewStars({
  summary,
  size = "small",
  showCount = true,
}: {
  summary: ReviewSummary;
  size?: "small" | "medium" | "large";
  showCount?: boolean;
}) {
  if (summary.count === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No reviews yet
      </Typography>
    );
  }

  const average = summary.average ?? 0;
  const ratings = `${summary.count} ${summary.count === 1 ? "review" : "reviews"}`;

  return (
    // Announced once, as a whole. The stars and the number say the same thing
    // twice over, so the visual parts are hidden and the label carries it.
    <Box
      role="img"
      aria-label={`${average} out of ${MAX_STARS} stars, from ${ratings}`}
      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
    >
      <Rating
        value={average}
        precision={0.1}
        max={MAX_STARS}
        size={size}
        readOnly
        aria-hidden
      />
      <Typography variant="caption" color="text.secondary" aria-hidden>
        {average.toFixed(1)}
        {showCount ? ` · ${ratings}` : null}
      </Typography>
    </Box>
  );
}
