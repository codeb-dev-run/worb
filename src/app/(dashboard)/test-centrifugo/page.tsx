'use client'

import { useState, useEffect } from 'react'
import { useCentrifugo } from '@/components/providers/centrifugo-provider'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'

interface LogEntry {
  time: string
  type: 'info' | 'success' | 'error' | 'warn'
  message: string
  data?: any
}

export default function CentrifugoTestPage() {
  const { client, isConnected, currentUser, subscribe, publish } = useCentrifugo()
  const { user, userProfile } = useAuth()
  const { currentWorkspace } = useWorkspace()

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [testChannel, setTestChannel] = useState('')
  const [testMessage, setTestMessage] = useState('Hello from test!')
  const [receivedMessages, setReceivedMessages] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<string[]>([])

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      type,
      message,
      data
    }
    setLogs(prev => [entry, ...prev.slice(0, 99)])
  }

  // 초기 상태 로깅
  useEffect(() => {
    addLog('info', 'Page loaded')
    addLog('info', `User: ${user?.uid || 'Not logged in'}`)
    addLog('info', `Workspace: ${currentWorkspace?.id || 'None'}`)

    if (user?.uid) {
      setTestChannel(`user:${user.uid}`)
    }
  }, [user, currentWorkspace])

  // Centrifugo 상태 변화 로깅
  useEffect(() => {
    if (isConnected) {
      addLog('success', 'Centrifugo connected!')
    } else {
      addLog('warn', 'Centrifugo not connected')
    }
  }, [isConnected])

  useEffect(() => {
    if (client) {
      addLog('success', 'Centrifugo client available')
    }
  }, [client])

  // 채널 구독 테스트
  const handleSubscribe = () => {
    if (!testChannel) {
      addLog('error', 'Please enter a channel name')
      return
    }

    if (!isConnected) {
      addLog('error', 'Centrifugo not connected')
      return
    }

    addLog('info', `Subscribing to channel: ${testChannel}`)

    const unsubscribe = subscribe(testChannel, (data) => {
      addLog('success', `Message received on ${testChannel}`, data)
      setReceivedMessages(prev => [{ channel: testChannel, data, time: new Date().toISOString() }, ...prev.slice(0, 19)])
    })

    setSubscriptions(prev => [...prev, testChannel])
    addLog('success', `Subscribed to ${testChannel}`)
  }

  // 메시지 발행 테스트
  const handlePublish = async () => {
    if (!testChannel) {
      addLog('error', 'Please enter a channel name')
      return
    }

    addLog('info', `Publishing to ${testChannel}...`)

    try {
      await publish(testChannel, {
        event: 'test',
        message: testMessage,
        sender: userProfile?.displayName || 'Anonymous',
        timestamp: new Date().toISOString()
      })
      addLog('success', 'Message published successfully')
    } catch (error) {
      addLog('error', 'Publish failed', error)
    }
  }

  // 서버 API 직접 테스트
  const handleServerPublish = async () => {
    if (!testChannel) {
      addLog('error', 'Please enter a channel name')
      return
    }

    addLog('info', `Testing server-side publish to ${testChannel}...`)

    try {
      const response = await fetch('/api/centrifugo/test-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: testChannel,
          data: {
            event: 'notification',
            title: 'Server Test',
            message: testMessage,
            type: 'info',
            timestamp: new Date().toISOString()
          }
        })
      })

      const result = await response.json()
      if (response.ok) {
        addLog('success', 'Server publish successful', result)
      } else {
        addLog('error', 'Server publish failed', result)
      }
    } catch (error) {
      addLog('error', 'Server publish error', error)
    }
  }

  // WebSocket 직접 연결 테스트
  const handleDirectWebSocket = () => {
    const wsUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_URL || 'wss://ws.codeb.kr/connection/websocket'
    addLog('info', `Testing direct WebSocket to ${wsUrl}...`)

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        addLog('success', 'Direct WebSocket connected!')
        ws.close()
      }

      ws.onerror = (e) => {
        addLog('error', 'Direct WebSocket error', e)
      }

      ws.onclose = (e) => {
        addLog('info', `WebSocket closed: ${e.code} - ${e.reason || 'No reason'}`)
      }
    } catch (error) {
      addLog('error', 'WebSocket creation failed', error)
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Centrifugo Test Page</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="text-sm text-gray-600">Connection</div>
          <div className={`text-lg font-bold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gray-100">
          <div className="text-sm text-gray-600">Client</div>
          <div className="text-lg font-bold">{client ? 'Ready' : 'Not Ready'}</div>
        </div>
        <div className="p-4 rounded-lg bg-gray-100">
          <div className="text-sm text-gray-600">User</div>
          <div className="text-lg font-bold truncate">{currentUser?.id || user?.uid || 'Anonymous'}</div>
        </div>
        <div className="p-4 rounded-lg bg-gray-100">
          <div className="text-sm text-gray-600">Subscriptions</div>
          <div className="text-lg font-bold">{subscriptions.length}</div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold mb-4">Channel Test</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Channel</label>
              <input
                type="text"
                value={testChannel}
                onChange={(e) => setTestChannel(e.target.value)}
                placeholder="user:xxx or workspace:xxx"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Message</label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Test message"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubscribe}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Subscribe
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold mb-4">Direct Tests</h2>
          <div className="space-y-3">
            <button
              onClick={handleDirectWebSocket}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test Direct WebSocket
            </button>
            <button
              onClick={handleServerPublish}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Test Server Publish
            </button>
            <div className="text-xs text-gray-500 mt-2">
              <div>WebSocket URL: {process.env.NEXT_PUBLIC_CENTRIFUGO_URL || 'wss://ws.codeb.kr/connection/websocket'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Received Messages */}
      {receivedMessages.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="font-bold mb-4">Received Messages ({receivedMessages.length})</h2>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {receivedMessages.map((msg, i) => (
              <div key={i} className="p-2 bg-green-50 rounded text-sm">
                <span className="text-gray-500">[{msg.channel}]</span>{' '}
                <span className="font-mono">{JSON.stringify(msg.data)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Logs ({logs.length})</h2>
          <button
            onClick={() => setLogs([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-1 font-mono text-sm">
          {logs.map((log, i) => (
            <div key={i} className={`p-2 rounded ${getLogColor(log.type)}`}>
              <span className="text-gray-400">[{log.time}]</span>{' '}
              <span className="font-semibold">{log.type.toUpperCase()}</span>{' '}
              {log.message}
              {log.data && (
                <pre className="text-xs mt-1 opacity-75">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
