// =============================================================================
// OpenAPI Specification Endpoint
// =============================================================================

import { NextResponse } from 'next/server'
import { getApiDocs } from '@/lib/swagger'

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: OpenAPI 스펙 조회
 *     description: API 문서화를 위한 OpenAPI 3.0 스펙을 반환합니다
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: OpenAPI 스펙
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  const spec = await getApiDocs()
  return NextResponse.json(spec)
}
