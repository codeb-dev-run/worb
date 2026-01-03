// =============================================================================
// Office WiFi Network Individual API
// DELETE: WiFi 네트워크 삭제 (관리자 전용)
// PATCH: WiFi 네트워크 수정 (관리자 전용)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

// DELETE: WiFi 네트워크 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    // 네트워크 조회
    const network = await prisma.officeWifiNetwork.findUnique({
      where: { id },
    })

    if (!network) {
      return createErrorResponse('WiFi network not found', 404, 'NOT_FOUND')
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: network.workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== 'admin') {
      return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    await prisma.officeWifiNetwork.delete({
      where: { id },
    })

    secureLogger.info('WiFi network deleted', {
      operation: 'wifi.delete',
      userId: user.id,
      networkId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Failed to delete WiFi network', error as Error, {
      operation: 'wifi.delete',
    })
    return createErrorResponse('Failed to delete WiFi network', 500, 'DELETE_FAILED')
  }
}

// PATCH: WiFi 네트워크 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params
    const body = await request.json()

    // 네트워크 조회
    const network = await prisma.officeWifiNetwork.findUnique({
      where: { id },
    })

    if (!network) {
      return createErrorResponse('WiFi network not found', 404, 'NOT_FOUND')
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: network.workspaceId,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== 'admin') {
      return createErrorResponse('Admin access required', 403, 'ADMIN_REQUIRED')
    }

    const updated = await prisma.officeWifiNetwork.update({
      where: { id },
      data: {
        name: body.name ?? network.name,
        ssid: body.ssid ?? network.ssid,
        bssid: body.bssid ?? network.bssid,
        isActive: body.isActive ?? network.isActive,
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    })

    secureLogger.info('WiFi network updated', {
      operation: 'wifi.update',
      userId: user.id,
      networkId: id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    secureLogger.error('Failed to update WiFi network', error as Error, {
      operation: 'wifi.update',
    })
    return createErrorResponse('Failed to update WiFi network', 500, 'UPDATE_FAILED')
  }
}
