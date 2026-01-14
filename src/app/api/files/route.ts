// =============================================================================
// File Management API - Storage Server Integration (db.codeb.kr)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { FileCategory } from '@prisma/client'

const isDev = process.env.NODE_ENV === 'development'

// 파일 저장 기본 경로
const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || '/opt/codeb/uploads'

// 최대 파일 크기 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024

// 허용된 MIME 타입
const ALLOWED_MIME_TYPES = [
  // 문서
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // 이미지
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // 동영상
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // 오디오
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // 압축파일
  'application/zip',
  'application/x-rar-compressed',
  'application/gzip',
]

// MIME 타입 → FileCategory 매핑
function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('gzip')) return 'ARCHIVE'
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.startsWith('text/')
  ) return 'DOCUMENT'
  return 'OTHER'
}

// 안전한 파일명 생성
function generateSafeFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
    .substring(0, 50)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${baseName}_${timestamp}_${random}${ext}`
}

// GET: 파일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const projectId = searchParams.get('projectId')
    const category = searchParams.get('category') as FileCategory | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_WORKSPACE_ID')
    }

    // 워크스페이스 멤버 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
    }

    // 파일 조회
    const where = {
      workspaceId,
      isDeleted: false,
      ...(projectId && { projectId }),
      ...(category && { category }),
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          project: {
            select: { id: true, name: true },
          },
          _count: {
            select: { downloads: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.file.count({ where }),
    ])

    return NextResponse.json({
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        category: file.category,
        url: file.publicUrl || `/api/files/${file.id}/download`,
        description: file.description,
        tags: file.tags,
        isPublic: file.isPublic,
        uploadedBy: file.uploadedBy,
        project: file.project,
        downloadCount: file._count.downloads,
        createdAt: file.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    secureLogger.error('Failed to fetch files', error as Error, { operation: 'files.list' })
    return createErrorResponse('Failed to fetch files', 500, 'FETCH_FAILED')
  }
}

// POST: 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const workspaceId = formData.get('workspaceId') as string | null
    const projectId = formData.get('projectId') as string | null
    const description = formData.get('description') as string | null
    const tagsString = formData.get('tags') as string | null
    const isPublic = formData.get('isPublic') === 'true'

    if (!file) {
      return createErrorResponse('No file provided', 400, 'NO_FILE')
    }

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_WORKSPACE_ID')
    }

    // 워크스페이스 멤버 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Forbidden', 403, 'NOT_A_MEMBER')
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse('File size exceeds 100MB limit', 400, 'FILE_TOO_LARGE')
    }

    // MIME 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return createErrorResponse('File type not allowed', 400, 'INVALID_FILE_TYPE')
    }

    // 저장 경로 생성
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const uploadDir = path.join(UPLOAD_BASE_PATH, workspaceId, String(year), month)

    // 디렉토리 생성
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 안전한 파일명 생성
    const safeFileName = generateSafeFileName(file.name)
    const filePath = path.join(uploadDir, safeFileName)
    const storagePath = `/${workspaceId}/${year}/${month}/${safeFileName}`

    // 파일 저장
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 태그 파싱
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : []

    // DB에 파일 정보 저장
    const fileRecord = await prisma.file.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        name: safeFileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        category: getFileCategory(file.type),
        storagePath,
        storageType: 'LOCAL',
        description: description || null,
        tags,
        isPublic,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    secureLogger.info('File uploaded', {
      operation: 'files.upload',
      userId: user.id,
      workspaceId,
      fileId: fileRecord.id,
      fileName: file.name,
      fileSize: file.size,
    })

    return NextResponse.json({
      id: fileRecord.id,
      name: fileRecord.name,
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
      size: fileRecord.size,
      category: fileRecord.category,
      url: `/api/files/${fileRecord.id}/download`,
      uploadedBy: fileRecord.uploadedBy,
      createdAt: fileRecord.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to upload file', error as Error, { operation: 'files.upload' })
    return createErrorResponse('Failed to upload file', 500, 'UPLOAD_FAILED')
  }
}
