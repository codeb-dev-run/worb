'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

const isDev = process.env.NODE_ENV === 'development'

// Centrifugo 타입 정의
interface CentrifugoSubscription {
  on: (event: string, callback: (ctx: any) => void) => void
  off: (event: string, callback?: (ctx: any) => void) => void
  subscribe: () => void
  unsubscribe: () => void
  publish: (data: any) => Promise<void>
}

interface CentrifugoClient {
  connect: () => void
  disconnect: () => void
  on: (event: string, callback: (ctx: any) => void) => void
  newSubscription: (channel: string, options?: any) => CentrifugoSubscription
  getSubscription: (channel: string) => CentrifugoSubscription | null
  removeSubscription: (sub: CentrifugoSubscription) => void
}

type CentrifugoContextType = {
  client: CentrifugoClient | null
  isConnected: boolean
  subscribe: (channel: string, onMessage: (data: any) => void) => () => void
  publish: (channel: string, data: any) => Promise<void>
}

const CentrifugoContext = createContext<CentrifugoContextType>({
  client: null,
  isConnected: false,
  subscribe: () => () => {},
  publish: async () => {},
})

export const useCentrifugo = () => {
  return useContext(CentrifugoContext)
}

// Socket.IO 호환 훅 (마이그레이션 편의)
export const useSocket = () => {
  const { client, isConnected, subscribe, publish } = useCentrifugo()

  return {
    socket: client,
    isConnected,
    // Socket.IO 호환 인터페이스
    emit: (event: string, data: any) => {
      if (data?.projectId) {
        publish(`project:${data.projectId}`, { event, ...data })
      }
    },
    on: (channel: string, callback: (data: any) => void) => {
      return subscribe(channel, callback)
    }
  }
}

export const CentrifugoProvider = ({ children }: { children: React.ReactNode }) => {
  const [client, setClient] = useState<CentrifugoClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [mounted, setMounted] = useState(false)
  const subscriptionsRef = useRef<Map<string, CentrifugoSubscription>>(new Map())

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const centrifugoUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_URL || 'wss://ws.codeb.kr/connection/websocket'

    if (!centrifugoUrl) {
      if (isDev) console.warn('Centrifugo: No server URL configured')
      return
    }

    let centrifugoInstance: CentrifugoClient | null = null

    const initCentrifugo = async () => {
      try {
        const { Centrifuge } = await import('centrifuge')

        // 토큰 가져오기 (인증된 연결용)
        const getToken = async () => {
          try {
            const response = await fetch('/api/centrifugo/token')
            if (response.ok) {
              const data = await response.json()
              return data.token
            }
          } catch (error) {
            if (isDev) console.warn('Failed to get Centrifugo token:', error)
          }
          return null
        }

        const token = await getToken()

        centrifugoInstance = new Centrifuge(centrifugoUrl, {
          token: token || undefined,
          // 익명 연결도 허용 (토큰 없이)
        }) as unknown as CentrifugoClient

        centrifugoInstance.on('connected', () => {
          if (isDev) console.log('Centrifugo connected')
          setIsConnected(true)
        })

        centrifugoInstance.on('disconnected', () => {
          if (isDev) console.log('Centrifugo disconnected')
          setIsConnected(false)
        })

        centrifugoInstance.on('error', (ctx: any) => {
          if (isDev) console.warn('Centrifugo error:', ctx)
        })

        centrifugoInstance.connect()
        setClient(centrifugoInstance)
      } catch (error) {
        if (isDev) console.warn('Centrifugo initialization failed:', error)
      }
    }

    initCentrifugo()

    return () => {
      if (centrifugoInstance) {
        // 모든 구독 해제
        subscriptionsRef.current.forEach((sub) => {
          sub.unsubscribe()
        })
        subscriptionsRef.current.clear()
        centrifugoInstance.disconnect()
      }
    }
  }, [mounted])

  // 채널 구독
  const subscribe = useCallback((channel: string, onMessage: (data: any) => void) => {
    if (!client) {
      return () => {}
    }

    // 이미 구독 중인지 확인
    let subscription = subscriptionsRef.current.get(channel)

    if (!subscription) {
      subscription = client.newSubscription(channel)
      subscriptionsRef.current.set(channel, subscription)
      subscription.subscribe()
    }

    const handlePublication = (ctx: any) => {
      onMessage(ctx.data)
    }

    subscription.on('publication', handlePublication)

    // 구독 해제 함수 반환
    return () => {
      if (subscription) {
        subscription.off('publication', handlePublication)
      }
    }
  }, [client])

  // 메시지 발행 (서버 API 통해)
  const publish = useCallback(async (channel: string, data: any) => {
    try {
      await fetch('/api/centrifugo/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, data })
      })
    } catch (error) {
      if (isDev) console.warn('Centrifugo publish failed:', error)
    }
  }, [])

  return (
    <CentrifugoContext.Provider value={{ client, isConnected, subscribe, publish }}>
      {children}
    </CentrifugoContext.Provider>
  )
}

// 하위 호환성을 위한 re-export
export const SocketProvider = CentrifugoProvider
