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

// Socket.IO emitter 호환을 위한 default export
export default {
  emitToProject,
  emitToChat,
  emitToUser,
  publish: publishToCentrifugo,
  broadcast: broadcastToCentrifugo
}
