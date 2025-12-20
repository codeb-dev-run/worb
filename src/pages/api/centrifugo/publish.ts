import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * Centrifugo 메시지 발행 API
 *
 * 클라이언트에서 직접 Centrifugo API를 호출하지 않고,
 * 이 엔드포인트를 통해 서버에서 발행합니다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    // 인증된 사용자만 발행 가능
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { channel, data } = req.body

    if (!channel || !data) {
      return res.status(400).json({ error: 'Missing channel or data' })
    }

    // 채널 권한 확인 (프로젝트 채널은 프로젝트 멤버만 발행 가능)
    // TODO: 필요시 권한 검증 로직 추가

    const apiUrl = process.env.CENTRIFUGO_API_URL || 'http://ws.codeb.kr:8000/api'
    const apiKey = process.env.CENTRIFUGO_API_KEY || ''

    const response = await fetch(`${apiUrl}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel,
        data: {
          ...data,
          _sender: session.user.id,
          _timestamp: new Date().toISOString()
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Centrifugo API error:', errorText)
      return res.status(500).json({ error: 'Publish failed' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Centrifugo publish error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
