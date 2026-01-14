// =============================================================================
// File Detail API - 파일 상세조회, 수정, 삭제
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || '/opt/codeb/uploads'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: 파일 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const file = await prisma.file.findUnique({
      where: { id, isDeleted: false },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
        workspace: {
          select: { id: true, name: true },
        },
        _count: {
          select: { downloads: true },
        },
      },
    })

    if (!file) {
      return createErrorResponse('File not found', 404, 'NOT_FOUND')
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

    if (!membership && !file.isPublic) {
      return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
    }

    return NextResponse.json({
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      category: file.category,
      url: `/api/files/${file.id}/download`,
      description: file.description,
      tags: file.tags,
      isPublic: file.isPublic,
      uploadedBy: file.uploadedBy,
      project: file.project,
      workspace: file.workspace,
      downloadCount: file._count.downloads,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    })
  } catch (error) {
    secureLogger.error('Failed to fetch file', error as Error, { operation: 'files.get' })
    return createErrorResponse('Failed to fetch file', 500, 'FETCH_FAILED')
  }
}

// PATCH: 파일 정보 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json()
    const { description, tags, isPublic, projectId } = body

    const file = await prisma.file.findUnique({
      where: { id, isDeleted: false },
    })

    if (!file) {
      return createErrorResponse('File not found', 404, 'NOT_FOUND')
    }

    // 권한 확인: 업로더 또는 관리자만 수정 가능
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

    if (file.uploadedById !== user.id && membership.role !== 'admin') {
      return createErrorResponse('Forbidden', 403, 'NOT_AUTHORIZED')
    }

    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(tags !== undefined && { tags }),
        ...(isPublic !== undefined && { isPublic }),
        ...(projectId !== undefined && { projectId: projectId || null }),
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    secureLogger.info('File updated', {
      operation: 'files.update',
      userId: user.id,
      fileId: id,
    })

    return NextResponse.json({
      id: updatedFile.id,
      name: updatedFile.name,
      originalName: updatedFile.originalName,
      description: updatedFile.description,
      tags: updatedFile.tags,
      isPublic: updatedFile.isPublic,
      projectId: updatedFile.projectId,
      updatedAt: updatedFile.updatedAt.toISOString(),
    })
  } catch (error) {
    secureLogger.error('Failed to update file', error as Error, { operation: 'files.update' })
    return createErrorResponse('Failed to update file', 500, 'UPDATE_FAILED')
  }
}

// DELETE: 파일 삭제 (소프트 삭제)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    const file = await prisma.file.findUnique({
      where: { id },
    })

    if (!file) {
      return createErrorResponse('File not found', 404, 'NOT_FOUND')
    }

    // 권한 확인: 업로더 또는 관리자만 삭제 가능
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

    if (file.uploadedById !== user.id && membership.role !== 'admin') {
      return createErrorResponse('Forbidden', 403, 'NOT_AUTHORIZED')
    }

    if (hardDelete && membership.role === 'admin') {
      // 하드 삭제: 실제 파일 및 DB 레코드 삭제
      const filePath = path.join(UPLOAD_BASE_PATH, file.storagePath)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }

      await prisma.file.delete({
        where: { id },
      })

      secureLogger.info('File hard deleted', {
        operation: 'files.hardDelete',
        userId: user.id,
        fileId: id,
      })

      return NextResponse.json({ success: true, message: '파일이 완전히 삭제되었습니다.' })
    } else {
      // 소프트 삭제: isDeleted 플래그만 설정
      await prisma.file.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })

      secureLogger.info('File soft deleted', {
        operation: 'files.softDelete',
        userId: user.id,
        fileId: id,
      })

      return NextResponse.json({ success: true, message: '파일이 삭제되었습니다.' })
    }
  } catch (error) {
    secureLogger.error('Failed to delete file', error as Error, { operation: 'files.delete' })
    return createErrorResponse('Failed to delete file', 500, 'DELETE_FAILED')
  }
}
