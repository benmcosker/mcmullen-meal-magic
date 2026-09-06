-- CreateTable
CREATE TABLE "shopping_text" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "partCount" INTEGER NOT NULL,
    "acceptedFor" INTEGER NOT NULL,
    "refusedFor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "shopping_text_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopping_text_householdId_weekStart_idx" ON "shopping_text"("householdId", "weekStart");

-- CreateIndex
CREATE INDEX "shopping_text_createdById_idx" ON "shopping_text"("createdById");

-- AddForeignKey
ALTER TABLE "shopping_text" ADD CONSTRAINT "shopping_text_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_text" ADD CONSTRAINT "shopping_text_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
