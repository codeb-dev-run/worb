/**
 * Centrifugo 서버 측 클라이언트
 *
 * 백엔드에서 Centrifugo HTTP API를 통해 메시지를 발행합니다.
 * Socket.IO의 Redis Emitter를 대체합니다.
 */

const isDev = process.env.NODE_ENV === 'development'

// Centrifugo API 설정
const CENTRIFUGO_API_URL = process.env.CENTRIFUGO_API_URL || 'http://ws.codeb.kr:8000/api'
const CENTRIFUGO_API_KEY = process.env.CENTRIFUGO_API_KEY || ''

interface PublishOptions {
  channel: string
  data: any
}

interface BroadcastOptions {
  channels: string[]
  data: any
}

/**
 * Centrifugo HTTP API를 통해 메시지 발행
 */
export const publishToCentrifugo = async (options: PublishOptions): Promise<boolean> => {
  try {
    const response = await fetch(`${CENTRIFUGO_API_URL}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${CENTRIFUGO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: options.channel,
        data: options.data
      })
    })

    if (!response.ok) {
      if (isDev) console.error('Centrifugo publish failed:', await response.text())
      return false
    }

    return true
  } catch (error) {
    if (isDev) console.error('Centrifugo publish error:', error)
    return false
  }
}

/**
 * 여러 채널에 동시 브로드캐스트
 */
export const broadcastToCentrifugo = async (options: BroadcastOptions): Promise<boolean> => {
  try {
    const response = await fetch(`${CENTRIFUGO_API_URL}/broadcast`, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${CENTRIFUGO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channels: options.channels,
        data: options.data
      })
    })

    if (!response.ok) {
      if (isDev) console.error('Centrifugo broadcast failed:', await response.text())
      return false
    }

    return true
  } catch (error) {
    if (isDev) console.error('Centrifugo broadcast error:', error)
    return false
  }
}

/**
 * 프로젝트 채널로 이벤트 발행 (Socket.IO emitToProject 대체)
 */
export const emitToProject = async (projectId: string, event: string, data: any): Promise<void> => {
  try {
    await publishToCentrifugo({
      channel: `project:${projectId}`,
      data: { event, ...data, timestamp: new Date().toISOString() }
    })
  } catch {
    // Silent fail - 실시간 이벤트 실패가 주요 기능에 영향을 주지 않도록
  }
}

/**
 * 채팅방 채널로 메시지 발행
 */
export const emitToChat = async (chatId: string, data: any): Promise<void> => {
  try {
    await publishToCentrifugo({
      channel: `chat:${chatId}`,
      data: { event: 'chat-message', ...data, timestamp: new Date().toISOString() }
    })
  } catch {
    // Silent fail
  }
}

/**
 * 사용자 개인 채널로 알림 발행
 */
export const emitToUser = async (userId: string, data: any): Promise<void> => {
  try {
    await publishToCentrifugo({
      channel: `user:${userId}`,
      data: { event: 'notification', ...data, timestamp: new Date().toISOString() }
    })
  } catch {
    // Silent fail
  }
}

/**
 * 워크스페이스 채널로 알림 발행
 */
export const emitToWorkspace = async (workspaceId: string, event: string, data: any): Promise<void> => {
  try {
    await publishToCentrifugo({
      channel: `workspace:${workspaceId}`,
      data: { event, ...data, timestamp: new Date().toISOString() }
    })
  } catch {
    // Silent fail
  }
}

// ============================================
// 알림 유형별 헬퍼 함수
// ============================================

/**
 * 인사기록 미등록 알림 (HR 탭 접근 시)
 */
export const notifyMissingProfile = async (userId: string, workspaceId: string): Promise<void> => {
  await emitToUser(userId, {
    event: 'hr:missing-profile',
    type: 'warning',
    title: '인사기록 등록 필요',
    message: '인사기록이 등록되지 않았습니다. HR 탭에서 기본 정보를 등록해주세요.',
    workspaceId,
    actionUrl: '/hr'
  })
}

/**
 * 프로젝트 멤버 추가 알림
 */
export const notifyProjectMemberAdded = async (
  userId: string,
  projectId: string,
  projectName: string,
  addedBy: string
): Promise<void> => {
  await emitToUser(userId, {
    event: 'project:member-added',
    type: 'info',
    title: '프로젝트 초대',
    message: `${projectName} 프로젝트에 초대되었습니다.`,
    projectId,
    addedBy,
    actionUrl: `/projects/${projectId}`
  })
}

/**
 * 프로젝트 멤버 제거 알림
 */
export const notifyProjectMemberRemoved = async (
  userId: string,
  projectId: string,
  projectName: string,
  removedBy: string
): Promise<void> => {
  await emitToUser(userId, {
    event: 'project:member-removed',
    type: 'warning',
    title: '프로젝트 제외',
    message: `${projectName} 프로젝트에서 제외되었습니다.`,
    projectId,
    removedBy
  })
}

/**
 * 작업 할당 알림
 */
export const notifyTaskAssigned = async (
  userId: string,
  taskId: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  assignedBy: string
): Promise<void> => {
  await emitToUser(userId, {
    event: 'task:assigned',
    type: 'info',
    title: '새 작업 할당',
    message: `[${projectName}] "${taskTitle}" 작업이 할당되었습니다.`,
    taskId,
    projectId,
    assignedBy,
    actionUrl: `/projects/${projectId}?task=${taskId}`
  })
}

/**
 * 공지사항 발행 알림 (워크스페이스 전체)
 */
export const notifyAnnouncement = async (
  workspaceId: string,
  announcementId: string,
  title: string,
  authorName: string
): Promise<void> => {
  await emitToWorkspace(workspaceId, 'announcement:published', {
    type: 'info',
    title: '새 공지사항',
    message: `${authorName}님이 공지사항을 등록했습니다: ${title}`,
    announcementId,
    actionUrl: `/announcements/${announcementId}`
  })
}

/**
 * 휴가 요청 알림 (관리자에게)
 */
export const notifyLeaveRequest = async (
  adminUserIds: string[],
  requestId: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  workspaceId: string
): Promise<void> => {
  const typeLabels: Record<string, string> = {
    ANNUAL: '연차', SICK: '병가', HALF_AM: '오전 반차', HALF_PM: '오후 반차',
    SPECIAL: '특별휴가', MATERNITY: '출산휴가', CHILDCARE: '육아휴직', OFFICIAL: '공가'
  }
  const typeLabel = typeLabels[leaveType] || leaveType

  for (const adminId of adminUserIds) {
    await emitToUser(adminId, {
      event: 'leave:requested',
      type: 'action',
      title: '휴가 승인 요청',
      message: `${employeeName}님이 ${typeLabel}을 신청했습니다 (${startDate} ~ ${endDate})`,
      requestId,
      workspaceId,
      actionUrl: '/hr?tab=leave'
    })
  }
}

/**
 * 휴가 승인/반려 알림 (신청자에게)
 */
export const notifyLeaveResult = async (
  userId: string,
  requestId: string,
  status: 'APPROVED' | 'REJECTED',
  leaveType: string,
  startDate: string,
  approverName: string
): Promise<void> => {
  const typeLabels: Record<string, string> = {
    ANNUAL: '연차', SICK: '병가', HALF_AM: '오전 반차', HALF_PM: '오후 반차',
    SPECIAL: '특별휴가', MATERNITY: '출산휴가', CHILDCARE: '육아휴직', OFFICIAL: '공가'
  }
  const typeLabel = typeLabels[leaveType] || leaveType
  const isApproved = status === 'APPROVED'

  await emitToUser(userId, {
    event: isApproved ? 'leave:approved' : 'leave:rejected',
    type: isApproved ? 'success' : 'error',
    title: isApproved ? '휴가 승인됨' : '휴가 반려됨',
    message: isApproved
      ? `${startDate} ${typeLabel}이 ${approverName}님에 의해 승인되었습니다.`
      : `${startDate} ${typeLabel}이 ${approverName}님에 의해 반려되었습니다.`,
    requestId,
    actionUrl: '/hr?tab=leave'
  })
}

/**
 * 출퇴근 시간 변경 요청 알림 (관리자에게)
 */
export const notifyAttendanceChangeRequest = async (
  adminUserIds: string[],
  requestId: string,
  employeeName: string,
  date: string,
  requestType: string,
  workspaceId: string
): Promise<void> => {
  const typeLabels: Record<string, string> = {
    CHECK_IN: '출근 시간', CHECK_OUT: '퇴근 시간', BOTH: '출퇴근 시간'
  }
  const typeLabel = typeLabels[requestType] || requestType

  for (const adminId of adminUserIds) {
    await emitToUser(adminId, {
      event: 'attendance:change-requested',
      type: 'action',
      title: '출퇴근 시간 수정 요청',
      message: `${employeeName}님이 ${date} ${typeLabel} 수정을 요청했습니다.`,
      requestId,
      workspaceId,
      actionUrl: '/hr?tab=attendance'
    })
  }
}

/**
 * 출퇴근 시간 변경 승인/반려 알림 (신청자에게)
 */
export const notifyAttendanceChangeResult = async (
  userId: string,
  requestId: string,
  status: 'APPROVED' | 'REJECTED',
  date: string,
  approverName: string
): Promise<void> => {
  const isApproved = status === 'APPROVED'

  await emitToUser(userId, {
    event: isApproved ? 'attendance:change-approved' : 'attendance:change-rejected',
    type: isApproved ? 'success' : 'error',
    title: isApproved ? '시간 수정 승인됨' : '시간 수정 반려됨',
    message: isApproved
      ? `${date} 출퇴근 시간 수정이 ${approverName}님에 의해 승인되었습니다.`
      : `${date} 출퇴근 시간 수정이 ${approverName}님에 의해 반려되었습니다.`,
    requestId,
    actionUrl: '/hr?tab=attendance'
  })
}

// Socket.IO emitter 호환을 위한 default export
export default {
  emitToProject,
  emitToChat,
  emitToUser,
  emitToWorkspace,
  publish: publishToCentrifugo,
  broadcast: broadcastToCentrifugo,
  // 알림 헬퍼
  notifyMissingProfile,
  notifyProjectMemberAdded,
  notifyProjectMemberRemoved,
  notifyTaskAssigned,
  notifyAnnouncement,
  notifyLeaveRequest,
  notifyLeaveResult,
  notifyAttendanceChangeRequest,
  notifyAttendanceChangeResult
}
