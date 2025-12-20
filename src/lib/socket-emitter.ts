/**
 * Socket Emitter - Centrifugo 기반 서버 측 이벤트 발행
 *
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새로운 코드는 centrifugo-client.ts를 직접 사용하세요.
 *
 * @deprecated 대신 centrifugo-client의 함수들을 사용하세요.
 */

import { emitToProject as centrifugoEmitToProject } from './centrifugo-client'

/**
 * @deprecated 대신 centrifugo-client의 emitToProject를 사용하세요.
 */
export const emitToProject = (projectId: string, event: string, data: any) => {
  // 비동기 함수를 동기적으로 호출 (하위 호환성)
  centrifugoEmitToProject(projectId, event, data).catch(() => {
    // Silent fail - socket errors handled gracefully
  })
}

// Socket.IO Emitter 호환 인터페이스 제거
// 더 이상 @socket.io/redis-emitter를 사용하지 않음
export const getSocketEmitter = () => {
  console.warn(
    '[DEPRECATED] getSocketEmitter is deprecated. ' +
    'Use centrifugo-client functions instead.'
  )
  return {
    to: (room: string) => ({
      emit: (event: string, data: any) => {
        const [type, id] = room.split(':')
        if (type === 'project' && id) {
          centrifugoEmitToProject(id, event, data)
        }
      }
    })
  }
}
