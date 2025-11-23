import {
  ref,
  push,
  onValue,
  off,
  set,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  get
} from 'firebase/database'
import { database } from './firebase'

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: 'admin' | 'member'
  receiverId: string
  message: string
  timestamp: number
  read: boolean
  type: 'text' | 'file' | 'image'
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

export interface ChatRoom {
  id: string
  participants: string[]
  lastMessage?: ChatMessage
  unreadCount: { [userId: string]: number }
  createdAt: string
  updatedAt: string
  title?: string
  type: 'direct' | 'group'
}

export class ChatService {
  private static instance: ChatService
  private messageListeners: Map<string, any> = new Map()

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  // 채팅방 생성 또는 가져오기
  async getOrCreateChatRoom(userId1: string, userId2: string): Promise<string> {
    const roomId = this.generateRoomId(userId1, userId2)
    const roomRef = ref(database, `chatRooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) {
      // 새 채팅방 생성
      const chatRoom: ChatRoom = {
        id: roomId,
        participants: [userId1, userId2],
        unreadCount: { [userId1]: 0, [userId2]: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'direct'
      }
      await set(roomRef, chatRoom)
    }

    return roomId
  }

  // 메시지 전송
  async sendMessage(
    roomId: string,
    senderId: string,
    senderName: string,
    senderRole: ChatMessage['senderRole'],
    receiverId: string,
    message: string,
    type: 'text' | 'file' | 'image' = 'text',
    fileData?: { url: string; name: string; size: number }
  ): Promise<void> {
    const messagesRef = ref(database, `messages/${roomId}`)

    const newMessage: Omit<ChatMessage, 'id'> = {
      senderId,
      senderName,
      senderRole,
      receiverId,
      message,
      timestamp: Date.now(),
      read: false,
      type,
      ...(fileData && {
        fileUrl: fileData.url,
        fileName: fileData.name,
        fileSize: fileData.size
      })
    }

    // 메시지 추가
    const messageRef = await push(messagesRef, newMessage)

    // 채팅방 업데이트
    await set(ref(database, `chatRooms/${roomId}/lastMessage`), { ...newMessage, id: messageRef.key })
    await set(ref(database, `chatRooms/${roomId}/updatedAt`), new Date().toISOString())

    // 받는 사람의 읽지 않은 메시지 수 증가
    const unreadRef = ref(database, `chatRooms/${roomId}/unreadCount/${receiverId}`)
    const currentUnread = await get(unreadRef)
    await set(unreadRef, (currentUnread.val() || 0) + 1)
  }

  // 메시지 읽음 처리
  async markAsRead(roomId: string, userId: string): Promise<void> {
    const unreadRef = ref(database, `chatRooms/${roomId}/unreadCount/${userId}`)
    await set(unreadRef, 0)

    // 해당 사용자가 받은 메시지들을 읽음 처리
    const messagesRef = ref(database, `messages/${roomId}`)
    const snapshot = await get(messagesRef)

    if (snapshot.exists()) {
      const messages = snapshot.val()

      // 각 메시지를 개별적으로 업데이트
      for (const [messageId, message] of Object.entries(messages)) {
        if ((message as any).receiverId === userId && !(message as any).read) {
          await set(ref(database, `messages/${roomId}/${messageId}/read`), true)
        }
      }
    }
  }

  // 메시지 실시간 수신
  subscribeToMessages(
    roomId: string,
    callback: (messages: ChatMessage[]) => void,
    limit: number = 50
  ): () => void {
    const messagesRef = query(
      ref(database, `messages/${roomId}`),
      orderByChild('timestamp'),
      limitToLast(limit)
    )

    const listener = onValue(messagesRef, (snapshot) => {
      const messages: ChatMessage[] = []
      snapshot.forEach((child) => {
        messages.push({
          id: child.key!,
          ...child.val()
        })
      })
      callback(messages.sort((a, b) => a.timestamp - b.timestamp))
    })

    this.messageListeners.set(roomId, listener)

    return () => {
      off(messagesRef, 'value', listener)
      this.messageListeners.delete(roomId)
    }
  }

  // 채팅방 목록 가져오기
  subscribeToUserChatRooms(
    userId: string,
    callback: (chatRooms: ChatRoom[]) => void
  ): () => void {
    const roomsRef = ref(database, 'chatRooms')

    const listener = onValue(roomsRef, (snapshot) => {
      const rooms: ChatRoom[] = []
      snapshot.forEach((child) => {
        const room = child.val()
        if (room.participants.includes(userId)) {
          rooms.push({ id: child.key!, ...room })
        }
      })

      // 최근 업데이트 순으로 정렬
      rooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      callback(rooms)
    })

    return () => off(roomsRef, 'value', listener)
  }

  // 온라인 사용자 상태 확인
  subscribeToUserStatus(
    userId: string,
    callback: (isOnline: boolean, lastSeen?: string) => void
  ): () => void {
    const statusRef = ref(database, `users/${userId}`)

    const listener = onValue(statusRef, (snapshot) => {
      const userData = snapshot.val()
      if (userData) {
        callback(userData.isOnline || false, userData.lastLogin)
      }
    })

    return () => off(statusRef, 'value', listener)
  }

  // 타이핑 상태 설정
  async setTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    const typingRef = ref(database, `typing/${roomId}/${userId}`)

    if (isTyping) {
      await set(typingRef, {
        isTyping: true,
        timestamp: serverTimestamp()
      })

      // 3초 후 자동으로 타이핑 상태 해제
      setTimeout(async () => {
        await set(typingRef, null)
      }, 3000)
    } else {
      await set(typingRef, null)
    }
  }

  // 타이핑 상태 구독
  subscribeToTypingStatus(
    roomId: string,
    currentUserId: string,
    callback: (typingUsers: string[]) => void
  ): () => void {
    const typingRef = ref(database, `typing/${roomId}`)

    const listener = onValue(typingRef, (snapshot) => {
      const typingData = snapshot.val() || {}
      const typingUsers = Object.keys(typingData)
        .filter(userId => userId !== currentUserId && typingData[userId]?.isTyping)

      callback(typingUsers)
    })

    return () => off(typingRef, 'value', listener)
  }

  // Room ID 생성 (항상 동일한 ID가 나오도록)
  private generateRoomId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_')
  }

  // 모든 리스너 정리
  cleanup(): void {
    this.messageListeners.clear()
  }
}

export default ChatService.getInstance()