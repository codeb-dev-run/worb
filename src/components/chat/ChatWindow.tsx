'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import chatService, { ChatMessage } from '@/lib/chat-service'

interface ChatWindowProps {
  receiverId: string
  receiverName: string
  onClose?: () => void
}

export default function ChatWindow({ receiverId, receiverName, onClose }: ChatWindowProps) {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [roomId, setRoomId] = useState<string>('')
  const [isOnline, setIsOnline] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // receiverName이 undefined인 경우 기본값 설정
  const displayName = receiverName || '사용자'

  useEffect(() => {
    if (!user || !userProfile) return

    // 채팅방 초기화
    const initializeChat = async () => {
      try {
        const chatRoomId = await chatService.getOrCreateChatRoom(user.uid, receiverId)
        setRoomId(chatRoomId)

        // 메시지 수신 구독
        const unsubscribeMessages = chatService.subscribeToMessages(
          chatRoomId,
          (newMessages) => {
            setMessages(newMessages)
            // 읽음 처리
            chatService.markAsRead(chatRoomId, user.uid)
          }
        )

        // 타이핑 상태 구독
        const unsubscribeTyping = chatService.subscribeToTypingStatus(
          chatRoomId,
          user.uid,
          setTypingUsers
        )

        // 온라인 상태 구독
        const unsubscribeStatus = chatService.subscribeToUserStatus(
          receiverId,
          (online) => setIsOnline(online)
        )

        return () => {
          unsubscribeMessages()
          unsubscribeTyping()
          unsubscribeStatus()
        }
      } catch (error) {
        console.error('채팅 초기화 실패:', error)
      }
    }

    initializeChat()
  }, [user, userProfile, receiverId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !userProfile || !roomId) return

    const messageToSend = newMessage.trim()
    // 메시지를 먼저 클리어
    setNewMessage('')
    setIsTyping(false)

    try {
      await chatService.sendMessage(
        roomId,
        user.uid,
        userProfile.displayName,
        userProfile.role,
        receiverId,
        messageToSend
      )
      await chatService.setTypingStatus(roomId, user.uid, false)
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      // 에러 발생 시 메시지 복구
      setNewMessage(messageToSend)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)

    if (!roomId || !user) return

    // 타이핑 상태 업데이트
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true)
      await chatService.setTypingStatus(roomId, user.uid, true)
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false)
      await chatService.setTypingStatus(roomId, user.uid, false)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const grouped: { [date: string]: ChatMessage[] } = {}

    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString()
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(message)
    })

    return grouped
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-500">
              {isOnline ? '온라인' : '오프라인'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* 날짜 구분선 */}
            <div className="flex items-center justify-center my-4">
              <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {formatDate(dateMessages[0].timestamp)}
              </div>
            </div>

            {/* 해당 날짜의 메시지들 */}
            {dateMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderId === user?.uid
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                    }`}
                >
                  {message.senderId !== user?.uid && (
                    <p className="text-xs font-medium mb-1">{message.senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <p className={`text-xs ${message.senderId === user?.uid ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                      {formatTime(message.timestamp)}
                    </p>
                    {message.senderId === user?.uid && (
                      <div className="text-xs text-blue-100">
                        {message.read ? '읽음' : '전송됨'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg max-w-xs">
              <div className="flex items-center space-x-1">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="text-sm ml-2">입력 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 4px;
          width: 4px;
          margin: 0 1px;
          background-color: #9ca3af;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}