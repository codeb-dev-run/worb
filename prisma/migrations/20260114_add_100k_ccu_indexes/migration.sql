-- 100K CCU Optimization: Add composite indexes for high-frequency queries
-- Target: Reduce query time by 90% for attendance and messaging operations

-- ============================================================================
-- Attendance Indexes (Most critical for 100K CCU)
-- ============================================================================

-- 가장 빈번한 쿼리: workspaceId + userId + date (출퇴근 조회)
CREATE INDEX IF NOT EXISTS "Attendance_workspaceId_userId_date_idx"
ON "Attendance" ("workspaceId", "userId", "date");

-- 워크스페이스별 사용자 출근 상태 조회
CREATE INDEX IF NOT EXISTS "Attendance_userId_workspaceId_status_idx"
ON "Attendance" ("userId", "workspaceId", "status");

-- ============================================================================
-- Verification: Check existing indexes
-- ============================================================================

-- Note: The following indexes should already exist:
-- @@index([userId, date])
-- @@index([workspaceId, date])
-- @@index([workspaceId, status])
-- @@index([date, status])

-- Message indexes already exist:
-- @@index([channelId, createdAt])
-- @@index([parentId])
