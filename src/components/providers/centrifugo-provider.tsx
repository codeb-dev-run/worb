'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

// 개발 모드 확인
const isDev = process.env.NODE_ENV === 'development'

// 항상 로그 출력 (디버깅용)
const LOG_ENABLED = true
const log = (...args: any[]) => LOG_ENABLED && console.log('[Centrifugo]', ...args)
const logError = (...args: any[]) => LOG_ENABLED && console.error('[Centrifugo]', ...args)

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

// Presence 정보 타입
interface PresenceUser {
  id: string
  name?: string
  email?: string
  avatar?: string
}

type CentrifugoContextType = {
  client: CentrifugoClient | null
  isConnected: boolean
  currentUser: PresenceUser | null
  subscribe: (channel: string, onMessage: (data: any) => void) => () => void
  subscribeWithPresence: (
    channel: string,
    onMessage: (data: any) => void,
    onPresence: (users: PresenceUser[]) => void
  ) => () => void
  publish: (channel: string, data: any) => Promise<void>
}

const CentrifugoContext = createContext<CentrifugoContextType>({
  client: null,
  isConnected: false,
  currentUser: null,
  subscribe: () => () => {},
  subscribeWithPresence: () => () => {},
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
  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null)
  const subscriptionsRef = useRef<Map<string, CentrifugoSubscription>>(new Map())
  const presenceCallbacksRef = useRef<Map<string, (users: PresenceUser[]) => void>>(new Map())

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
      log('Starting initialization...', { url: centrifugoUrl })

      try {
        log('Importing centrifuge library...')
        const { Centrifuge } = await import('centrifuge')
        log('Library imported successfully')

        // 토큰 가져오기 (인증된 연결용)
        const getTokenData = async (): Promise<{ token: string | null; user: PresenceUser | null }> => {
          try {
            log('Fetching token from /api/centrifugo/token...')
            const response = await fetch('/api/centrifugo/token')
            log('Token response status:', response.status)
            if (response.ok) {
              const data = await response.json()
              log('Token data received:', { hasToken: !!data.token, user: data.user })
              return { token: data.token, user: data.user }
            } else {
              logError('Token fetch failed:', response.status, await response.text())
            }
          } catch (error) {
            logError('Token fetch error:', error)
          }
          return { token: null, user: null }
        }

        const tokenData = await getTokenData()
        const token = tokenData.token

        // 현재 사용자 정보 저장
        if (tokenData.user) {
          setCurrentUser(tokenData.user)
        }

        log('Creating Centrifuge instance...', { hasToken: !!token })
        centrifugoInstance = new Centrifuge(centrifugoUrl, {
          token: token || undefined,
        }) as unknown as CentrifugoClient
        log('Centrifuge instance created')

        centrifugoInstance.on('connected', (ctx: any) => {
          log('Connected!', ctx)
          setIsConnected(true)
        })

        centrifugoInstance.on('connecting', (ctx: any) => {
          log('Connecting...', ctx)
        })

        centrifugoInstance.on('disconnected', (ctx: any) => {
          log('Disconnected', ctx)
          setIsConnected(false)
        })

        centrifugoInstance.on('error', (ctx: any) => {
          logError('Connection error:', ctx)
        })

        log('Calling connect()...')
        centrifugoInstance.connect()
        setClient(centrifugoInstance)
        log('Connect called, waiting for connection...')
      } catch (error) {
        logError('Initialization failed:', error)
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
      log('Subscribe called but client not ready')
      return () => {}
    }

    log('Subscribe called for channel:', channel)

    // 이미 구독 중인지 확인
    let subscription = subscriptionsRef.current.get(channel)

    if (!subscription) {
      log('Creating new subscription for:', channel)
      subscription = client.newSubscription(channel)
      subscriptionsRef.current.set(channel, subscription)

      // 구독 상태 이벤트 핸들러
      subscription.on('subscribing', (ctx: any) => {
        log(`Channel ${channel} subscribing...`, ctx)
      })

      subscription.on('subscribed', (ctx: any) => {
        log(`Channel ${channel} subscribed!`, ctx)
      })

      subscription.on('error', (ctx: any) => {
        logError(`Channel ${channel} error:`, ctx)
      })

      subscription.on('unsubscribed', (ctx: any) => {
        log(`Channel ${channel} unsubscribed`, ctx)
      })

      subscription.subscribe()
    } else {
      log('Reusing existing subscription for:', channel)
    }

    const handlePublication = (ctx: any) => {
      log(`Message received on ${channel}:`, ctx.data)
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

  // Presence와 함께 채널 구독
  const subscribeWithPresence = useCallback((
    channel: string,
    onMessage: (data: any) => void,
    onPresence: (users: PresenceUser[]) => void
  ) => {
    if (!client) {
      return () => {}
    }

    // presence 콜백 저장
    presenceCallbacksRef.current.set(channel, onPresence)

    // 이미 구독 중인지 확인
    let subscription = subscriptionsRef.current.get(channel)

    if (!subscription) {
      subscription = client.newSubscription(channel, {
        // Presence 활성화
        presence: true,
        joinLeave: true,
      })
      subscriptionsRef.current.set(channel, subscription)

      // Presence 이벤트 핸들링
      subscription.on('join', (ctx: any) => {
        if (isDev) console.log('[Centrifugo] User joined:', ctx.info)
        // Presence 목록 갱신
        fetchPresence(channel)
      })

      subscription.on('leave', (ctx: any) => {
        if (isDev) console.log('[Centrifugo] User left:', ctx.info)
        // Presence 목록 갱신
        fetchPresence(channel)
      })

      subscription.subscribe()

      // 초기 presence 조회
      setTimeout(() => fetchPresence(channel), 500)
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
      presenceCallbacksRef.current.delete(channel)
    }
  }, [client])

  // Presence 조회
  const fetchPresence = useCallback(async (channel: string) => {
    try {
      const response = await fetch('/api/centrifugo/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel })
      })
      if (response.ok) {
        const data = await response.json()
        const users: PresenceUser[] = Object.values(data.presence || {}).map((p: any) => ({
          id: p.client || p.user,
          name: p.info?.name,
          email: p.info?.email,
          avatar: p.info?.avatar,
        }))

        const callback = presenceCallbacksRef.current.get(channel)
        if (callback) {
          callback(users)
        }
      }
    } catch (error) {
      if (isDev) console.warn('Failed to fetch presence:', error)
    }
  }, [])

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
    <CentrifugoContext.Provider value={{ client, isConnected, currentUser, subscribe, subscribeWithPresence, publish }}>
      {children}
    </CentrifugoContext.Provider>
  )
}

// 하위 호환성을 위한 re-export
export const SocketProvider = CentrifugoProvider
