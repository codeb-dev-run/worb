import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * Centrifugo Presence API
 *
 * 채널에 접속 중인 사용자 목록을 조회합니다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { channel } = req.body

    if (!channel) {
      return res.status(400).json({ error: 'Channel is required' })
    }

    const apiUrl = process.env.CENTRIFUGO_API_URL || 'http://ws.codeb.kr:8000/api'
    const apiKey = process.env.CENTRIFUGO_API_KEY || ''

    if (!apiKey) {
      return res.status(200).json({ presence: {} })
    }

    // Centrifugo presence API 호출
    const response = await fetch(`${apiUrl}/presence`, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel }),
    })

    if (!response.ok) {
      console.warn('Centrifugo presence API error:', response.status)
      return res.status(200).json({ presence: {} })
    }

    const data = await response.json()

    return res.status(200).json({
      presence: data.result?.presence || {}
    })
  } catch (error) {
    console.error('Centrifugo presence error:', error)
    return res.status(200).json({ presence: {} })
  }
}
