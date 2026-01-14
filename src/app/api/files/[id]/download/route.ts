// =============================================================================
// File Download API - 파일 다운로드 및 이력 기록
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || '/opt/codeb/uploads'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: 파일 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 파일 조회
    const file = await prisma.file.findUnique({
      where: { id, isDeleted: false },
    })

    if (!file) {
      return createErrorResponse('File not found', 404, 'NOT_FOUND')
    }

    // 인증 확인 (공개 파일이 아닌 경우)
    let userId: string | null = null
    if (!file.isPublic) {
      const user = await authenticateRequest()
      if (!user) {
        return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
      }

      // 워크스페이스 멤버 확인
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: file.workspaceId,
            userId: user.id,
          },
        },
      })

      if (!membership) {
        return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
      }

      userId = user.id
    } else {
      // 공개 파일인 경우도 인증된 사용자라면 기록
      try {
        const user = await authenticateRequest()
        userId = user?.id || null
      } catch {
        // 인증 실패 무시 (공개 파일이므로)
      }
    }

    // 파일 경로 확인
    const filePath = path.join(UPLOAD_BASE_PATH, file.storagePath)
    if (!existsSync(filePath)) {
      secureLogger.error('File not found on disk', new Error('File missing'), {
        operation: 'files.download',
        fileId: id,
        storagePath: file.storagePath,
      })
      return createErrorResponse('File not found on disk', 404, 'FILE_MISSING')
    }

    // 파일 읽기
    const fileBuffer = await readFile(filePath)

    // 다운로드 이력 기록 (인증된 사용자인 경우)
    if (userId) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      await prisma.fileDownload.create({
        data: {
          fileId: id,
          userId,
          ipAddress,
          userAgent: userAgent.substring(0, 500), // 최대 500자
        },
      }).catch(() => {
        // 다운로드 이력 기록 실패는 무시
      })

      secureLogger.info('File downloaded', {
        operation: 'files.download',
        userId,
        fileId: id,
        fileName: file.originalName,
      })
    }

    // Content-Disposition 헤더 설정 (파일명 인코딩)
    const encodedFileName = encodeURIComponent(file.originalName)
    const contentDisposition = `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': contentDisposition,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    secureLogger.error('Failed to download file', error as Error, { operation: 'files.download' })
    return createErrorResponse('Failed to download file', 500, 'DOWNLOAD_FAILED')
  }
}
