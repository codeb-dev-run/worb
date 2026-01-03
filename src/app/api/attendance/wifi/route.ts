// =============================================================================
// Office WiFi Network Management API
// GET: 등록된 사무실 WiFi 네트워크 목록 조회
// POST: 새 WiFi 네트워크 등록 (관리자 전용)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, wifiNetworkSchema, validationErrorResponse } from '@/lib/validation'

// GET: 등록된 WiFi 네트워크 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_WORKSPACE')
    }

    // 사용자가 워크스페이스 멤버인지 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return createErrorResponse('Not a member of this workspace', 403, 'NOT_MEMBER')
    }

    const networks = await prisma.officeWifiNetwork.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      networks,
      count: networks.length,
    })
  } catch (error) {
    secureLogger.error('Failed to fetch WiFi networks', error as Error, {
      operation: 'wifi.list',
    })
    return createErrorResponse('Failed to fetch WiFi networks', 500, 'FETCH_FAILED')
  }
}

// POST: 새 WiFi 네트워크 등록 (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const validation = await validateBody(request, wifiNetworkSchema.extend({
      workspaceId: require('zod').z.string().uuid(),
    }))
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const { workspaceId, name, ssid, bssid, isActive } = validation.data!

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== 'admin') {
      return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    // 중복 SSID 확인
    const existing = await prisma.officeWifiNetwork.findUnique({
      where: {
        workspaceId_ssid: {
          workspaceId,
          ssid,
        },
      },
    })

    if (existing) {
      return createErrorResponse('WiFi network with this SSID already exists', 400, 'DUPLICATE_SSID')
    }

    const network = await prisma.officeWifiNetwork.create({
      data: {
        workspaceId,
        name,
        ssid,
        bssid,
        isActive: isActive ?? true,
        createdBy: user.id,
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    })

    secureLogger.info('WiFi network registered', {
      operation: 'wifi.create',
      userId: user.id,
      workspaceId,
      ssid,
    })

    return NextResponse.json(network, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to register WiFi network', error as Error, {
      operation: 'wifi.create',
    })
    return createErrorResponse('Failed to register WiFi network', 500, 'CREATE_FAILED')
  }
}
