-- CreateTable
CREATE TABLE "AIMetrics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 0,
    "budgetUsage" INTEGER NOT NULL DEFAULT 0,
    "efficiency" INTEGER NOT NULL DEFAULT 0,
    "satisfaction" INTEGER NOT NULL DEFAULT 0,
    "predictions" JSONB,
    "risks" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIMetrics_projectId_key" ON "AIMetrics"("projectId");

-- AddForeignKey
ALTER TABLE "AIMetrics" ADD CONSTRAINT "AIMetrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
