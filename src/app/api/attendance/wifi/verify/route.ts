// =============================================================================
// WiFi Verification API
// POST: 클라이언트 WiFi 정보를 서버 등록 정보와 비교하여 검증
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const body = await request.json()
    const { workspaceId, wifiSSID, wifiBSSID } = body

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'MISSING_WORKSPACE')
    }

    if (!wifiSSID) {
      return createErrorResponse('wifiSSID is required', 400, 'MISSING_WIFI_SSID')
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
      return createErrorResponse('Not a member of this workspace', 403, 'NOT_MEMBER')
    }

    // 워크스페이스 정책 확인
    const policy = await prisma.workPolicy.findFirst({
      where: { workspaceId },
    })

    // WiFi 검증이 비활성화되어 있으면 항상 통과
    if (!policy?.wifiVerificationEnabled) {
      return NextResponse.json({
        verified: true,
        message: 'WiFi verification is not enabled for this workspace',
        requiresVerification: false,
      })
    }

    // 등록된 WiFi 네트워크 조회
    const registeredNetworks = await prisma.officeWifiNetwork.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
    })

    if (registeredNetworks.length === 0) {
      return NextResponse.json({
        verified: true,
        message: 'No WiFi networks registered for verification',
        requiresVerification: false,
      })
    }

    // SSID 매칭 확인
    let matchedNetwork = registeredNetworks.find(n => n.ssid === wifiSSID)

    // BSSID도 확인 (더 정확한 검증)
    if (matchedNetwork && wifiBSSID && matchedNetwork.bssid) {
      if (matchedNetwork.bssid !== wifiBSSID) {
        matchedNetwork = undefined // BSSID가 일치하지 않으면 검증 실패
      }
    }

    const verified = !!matchedNetwork

    secureLogger.info('WiFi verification attempted', {
      operation: 'wifi.verify',
      userId: user.id,
      workspaceId,
      wifiSSID,
      verified,
      matchedNetworkId: matchedNetwork?.id,
    })

    return NextResponse.json({
      verified,
      matchedNetwork: verified ? {
        id: matchedNetwork!.id,
        name: matchedNetwork!.name,
        ssid: matchedNetwork!.ssid,
      } : null,
      message: verified
        ? 'WiFi verified successfully'
        : 'Connected WiFi is not registered as office network',
      requiresVerification: policy.wifiVerificationRequired,
    })
  } catch (error) {
    secureLogger.error('WiFi verification failed', error as Error, {
      operation: 'wifi.verify',
    })
    return createErrorResponse('WiFi verification failed', 500, 'VERIFY_FAILED')
  }
}
