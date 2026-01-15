import { NextApiRequest, NextApiResponse } from 'next'

/**
 * Centrifugo 서버 측 publish 테스트 API
 * 서버에서 직접 Centrifugo로 메시지를 발행합니다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { channel, data } = req.body

  if (!channel || !data) {
    return res.status(400).json({ error: 'Missing channel or data' })
  }

  const apiUrl = process.env.CENTRIFUGO_API_URL || 'http://ws.codeb.kr:8000/api'
  const apiKey = process.env.CENTRIFUGO_API_KEY || ''

  console.log('[Centrifugo Test] Publishing to:', channel)
  console.log('[Centrifugo Test] API URL:', apiUrl)
  console.log('[Centrifugo Test] Has API Key:', !!apiKey)

  try {
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
          _serverTimestamp: new Date().toISOString()
        }
      })
    })

    const responseText = await response.text()
    console.log('[Centrifugo Test] Response status:', response.status)
    console.log('[Centrifugo Test] Response body:', responseText)

    if (!response.ok) {
      return res.status(500).json({
        error: 'Centrifugo publish failed',
        status: response.status,
        response: responseText
      })
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { raw: responseText }
    }

    return res.status(200).json({
      success: true,
      channel,
      centrifugoResponse: result
    })
  } catch (error) {
    console.error('[Centrifugo Test] Error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
