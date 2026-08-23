-- Reviews: a star rating and, optionally, what the cook thought.
--
-- One table rather than two. A score with no explanation is worth less than
-- "five stars, but halve the chilli", and a note from someone who never said
-- whether they liked it leaves the reader guessing - so the two travel
-- together.
--
-- One review per person per recipe: the average answers "how many people liked
-- this", not "how many times did its keenest fan say so".

-- CreateTable
CREATE TABLE "recipe_review" (
    "id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "body" TEXT,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_review_recipeId_createdAt_idx" ON "recipe_review"("recipeId", "createdAt");

-- CreateIndex
CREATE INDEX "recipe_review_userId_idx" ON "recipe_review"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_review_recipeId_userId_key" ON "recipe_review"("recipeId", "userId");

-- AddForeignKey
ALTER TABLE "recipe_review" ADD CONSTRAINT "recipe_review_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_review" ADD CONSTRAINT "recipe_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the scale honest at the storage layer.
--
-- The average is only meaningful if nothing outside 1-5 can reach the column,
-- and application validation is one refactor away from being bypassed. A
-- zero-star review would silently drag every average down.
ALTER TABLE "recipe_review"
  ADD CONSTRAINT "recipe_review_stars_range" CHECK ("stars" BETWEEN 1 AND 5);

-- A body of nothing but spaces is not a comment; it renders as a blank
-- paragraph nobody can tell how to remove. NULL is the way to say "no words",
-- and the application writes NULL rather than an empty string.
ALTER TABLE "recipe_review"
  ADD CONSTRAINT "recipe_review_body_not_blank"
  CHECK ("body" IS NULL OR btrim("body") <> '');
