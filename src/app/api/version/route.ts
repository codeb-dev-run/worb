import { NextResponse } from 'next/server'

/**
 * Version API Endpoint
 *
 * 클라이언트에서 현재 서버의 빌드 ID를 조회하여
 * 새 버전 배포 여부를 확인하는 데 사용됩니다.
 *
 * 캐시를 완전히 비활성화하여 항상 최신 버전을 반환합니다.
 */

// 빌드 시점에 생성된 고유 ID (빌드마다 변경됨)
const BUILD_ID = process.env.NEXT_BUILD_ID || process.env.BUILD_ID || Date.now().toString()

// 빌드 시간 (배포 시점 기록)
const BUILD_TIME = new Date().toISOString()

export async function GET() {
  return NextResponse.json(
    {
      buildId: BUILD_ID,
      buildTime: BUILD_TIME,
      version: process.env.npm_package_version || '1.0.0',
    },
    {
      headers: {
        // 캐시 완전 비활성화
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        // CDN 캐시도 비활성화
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    }
  )
}

// 동적 렌더링 강제 (캐시 방지)
export const dynamic = 'force-dynamic'
export const revalidate = 0
