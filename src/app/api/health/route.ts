import { NextResponse } from 'next/server'

// =============================================================================
// Health Check API - Kubernetes Liveness Probe
// Returns 200 if the application is running
// =============================================================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 서버 상태 확인
 *     description: 서버의 liveness 상태를 확인합니다. Kubernetes liveness probe에 사용됩니다.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: 서버 정상 동작
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: 서버 가동 시간 (초)
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   enum: [development, production]
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    }
  )
}
