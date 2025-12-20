import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * Centrifugo JWT 토큰 생성 API
 *
 * 클라이언트가 Centrifugo에 연결할 때 인증 토큰을 제공합니다.
 * 익명 연결도 허용하지만, 인증된 사용자는 더 많은 채널에 접근할 수 있습니다.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    // Centrifugo JWT 토큰 생성
    const secret = process.env.CENTRIFUGO_SECRET || ''

    if (!secret) {
      // 시크릿이 없으면 익명 연결 허용
      return res.status(200).json({ token: null, anonymous: true })
    }

    // JWT 수동 생성 (jsonwebtoken 의존성 없이)
    // Centrifugo는 간단한 HMAC-SHA256 JWT를 사용
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')

    const payload = Buffer.from(JSON.stringify({
      sub: session?.user?.id || 'anonymous',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1시간
      info: session?.user ? {
        name: session.user.name,
        email: session.user.email
      } : undefined
    })).toString('base64url')

    // Node.js crypto를 사용한 HMAC-SHA256 서명
    const crypto = await import('crypto')
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url')

    const token = `${header}.${payload}.${signature}`

    return res.status(200).json({ token })
  } catch (error) {
    console.error('Centrifugo token generation error:', error)
    return res.status(500).json({ error: 'Token generation failed' })
  }
}
