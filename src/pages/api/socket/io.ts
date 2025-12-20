import { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * Socket.io status endpoint
 *
 * @deprecated Socket.IO는 더 이상 사용되지 않습니다.
 * Centrifugo로 마이그레이션되었습니다.
 *
 * 새로운 엔드포인트:
 * - /api/centrifugo/token - 연결 토큰 발급
 * - /api/centrifugo/publish - 메시지 발행
 */
const SocketHandler = (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({
    status: 'deprecated',
    message: 'Socket.IO has been replaced by Centrifugo',
    migration: {
      centrifugoUrl: process.env.NEXT_PUBLIC_CENTRIFUGO_URL || 'wss://ws.codeb.kr/connection/websocket',
      tokenEndpoint: '/api/centrifugo/token',
      publishEndpoint: '/api/centrifugo/publish'
    }
  })
}

export default SocketHandler
