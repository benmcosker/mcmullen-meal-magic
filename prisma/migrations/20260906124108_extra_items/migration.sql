-- CreateTable
CREATE TABLE "extra_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT,
    "normalisedName" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "extra_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extra_item_createdById_idx" ON "extra_item"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "extra_item_householdId_normalisedName_weekStart_key" ON "extra_item"("householdId", "normalisedName", "weekStart");

-- AddForeignKey
ALTER TABLE "extra_item" ADD CONSTRAINT "extra_item_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_item" ADD CONSTRAINT "extra_item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
