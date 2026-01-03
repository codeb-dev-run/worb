-- Add Flexible Work and WiFi Verification Support
-- Migration: add_flexible_work_wifi
-- Date: 2025-01-03

-- Step 1: Create new enums (if not exists)
DO $$ BEGIN
    CREATE TYPE "WorkLocationType" AS ENUM ('OFFICE', 'REMOTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WorkSessionType" AS ENUM ('OFFICE_WORK', 'REMOTE_WORK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new columns to Attendance table
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "totalWorkedMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "officeWorkedMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "remoteWorkedMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "weeklyTargetMinutes" INTEGER NOT NULL DEFAULT 2400;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "isFlexibleDay" BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Add new columns to WorkPolicy table
ALTER TABLE "WorkPolicy" ALTER COLUMN "weeklyRequiredMinutes" SET DEFAULT 2400;
ALTER TABLE "WorkPolicy" ALTER COLUMN "weeklyRequiredMinutes" SET NOT NULL;
UPDATE "WorkPolicy" SET "weeklyRequiredMinutes" = 2400 WHERE "weeklyRequiredMinutes" IS NULL;

ALTER TABLE "WorkPolicy" ADD COLUMN IF NOT EXISTS "wifiVerificationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkPolicy" ADD COLUMN IF NOT EXISTS "wifiVerificationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkPolicy" ADD COLUMN IF NOT EXISTS "allowFlexibleWork" BOOLEAN NOT NULL DEFAULT true;

-- Step 4: Create WorkSession table
CREATE TABLE IF NOT EXISTS "WorkSession" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "sessionType" "WorkSessionType" NOT NULL DEFAULT 'OFFICE_WORK',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "wifiSSID" TEXT,
    "wifiBSSID" TEXT,
    "ipAddress" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create OfficeWifiNetwork table
CREATE TABLE IF NOT EXISTS "OfficeWifiNetwork" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ssid" TEXT NOT NULL,
    "bssid" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "OfficeWifiNetwork_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create WeeklyWorkSummary table
CREATE TABLE IF NOT EXISTS "WeeklyWorkSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "targetMinutes" INTEGER NOT NULL DEFAULT 2400,
    "totalWorkedMinutes" INTEGER NOT NULL DEFAULT 0,
    "officeMinutes" INTEGER NOT NULL DEFAULT 0,
    "remoteMinutes" INTEGER NOT NULL DEFAULT 0,
    "remainingMinutes" INTEGER NOT NULL DEFAULT 2400,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyWorkSummary_pkey" PRIMARY KEY ("id")
);

-- Step 7: Create indexes for WorkSession
CREATE INDEX IF NOT EXISTS "WorkSession_attendanceId_idx" ON "WorkSession"("attendanceId");
CREATE INDEX IF NOT EXISTS "WorkSession_userId_startTime_idx" ON "WorkSession"("userId", "startTime");
CREATE INDEX IF NOT EXISTS "WorkSession_workspaceId_startTime_idx" ON "WorkSession"("workspaceId", "startTime");

-- Step 8: Create indexes for OfficeWifiNetwork
CREATE UNIQUE INDEX IF NOT EXISTS "OfficeWifiNetwork_workspaceId_ssid_key" ON "OfficeWifiNetwork"("workspaceId", "ssid");
CREATE INDEX IF NOT EXISTS "OfficeWifiNetwork_workspaceId_isActive_idx" ON "OfficeWifiNetwork"("workspaceId", "isActive");

-- Step 9: Create indexes for WeeklyWorkSummary
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyWorkSummary_userId_workspaceId_weekStart_key" ON "WeeklyWorkSummary"("userId", "workspaceId", "weekStart");
CREATE INDEX IF NOT EXISTS "WeeklyWorkSummary_userId_weekStart_idx" ON "WeeklyWorkSummary"("userId", "weekStart");
CREATE INDEX IF NOT EXISTS "WeeklyWorkSummary_workspaceId_weekStart_idx" ON "WeeklyWorkSummary"("workspaceId", "weekStart");

-- Step 10: Add foreign keys
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfficeWifiNetwork" ADD CONSTRAINT "OfficeWifiNetwork_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeWifiNetwork" ADD CONSTRAINT "OfficeWifiNetwork_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WeeklyWorkSummary" ADD CONSTRAINT "WeeklyWorkSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyWorkSummary" ADD CONSTRAINT "WeeklyWorkSummary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
