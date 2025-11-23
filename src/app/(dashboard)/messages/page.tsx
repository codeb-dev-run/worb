'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off, push, update } from 'firebase/database'
import { app } from '@/lib/firebase'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare, Send, Search, Filter, Star, Archive,
  Trash2, Reply, Forward, Paperclip, Calendar, User,
  Mail, Phone, Building2, Clock, CheckCheck, Loader2,
  Inbox, FileText, Hash, Briefcase, Bell
} from 'lucide-react'

interface Message {
  id: string
  subject: string
  content: string
  fromId: string
  fromName: string
  fromEmail: string
  toId: string
  toName: string
  toEmail: string
  projectId?: string
  projectName?: string
  type: 'general' | 'project' | 'announcement'
  priority: 'low' | 'normal' | 'high'
  status: 'unread' | 'read' | 'replied' | 'forwarded'
  isStarred: boolean
  isArchived: boolean
  attachments?: string[]
  createdAt: string
  readAt?: string
  repliedAt?: string
}

const CHANNEL_TYPES = {
  general: { label: '일반', icon: Hash },
  project: { label: '프로젝트', icon: Briefcase },
  announcement: { label: '공지사항', icon: Bell },
}

const priorityConfig = {
  low: { label: '낮음', variant: 'outline' as const },
  normal: { label: '보통', variant: 'secondary' as const },
  high: { label: '높음', variant: 'destructive' as const }
}

export default function MessagesPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    type: 'general' as const,
    priority: 'normal' as const,
    toEmail: ''
  })



  // 고객이 아닌 경우 리다이렉트


  // 메시지 데이터 로드
  useEffect(() => {
    if (!user || !userProfile) return

    const db = getDatabase(app)
    const messagesRef = ref(db, 'messages')

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const messagesList = Object.entries(data).map(([id, message]: [string, any]) => ({
          id,
          ...message
        }))

        // 고객은 자신이 받거나 보낸 메시지만 볼 수 있음
        const filteredMessages = messagesList.filter(msg =>
          msg.toId === user.uid || msg.fromId === user.uid
        )

        setMessages(filteredMessages.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
      } else {
        setMessages([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, userProfile])

  // 권한 체크
  if (userProfile?.role !== 'admin' && userProfile?.role !== 'member') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">접근 권한이 없습니다.</p>
      </div>
    )
  }

  const filteredMessages = messages.filter(message => {
    const matchesSearch =
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.fromName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || message.type === filterType
    const matchesFilter =
      filterType === 'starred' ? message.isStarred :
        filterType === 'archived' ? message.isArchived :
          filterType === 'unread' ? message.status === 'unread' :
            true

    return matchesSearch && matchesType && matchesFilter && !message.isArchived
  })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const db = getDatabase(app)
      const messageData = {
        subject: formData.subject,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        fromId: user!.uid,
        fromName: userProfile?.displayName || user!.email || '알 수 없음',
        fromEmail: user!.email || '',
        toId: 'admin', // 실제로는 수신자 ID를 찾아야 함
        toName: '관리자',
        toEmail: formData.toEmail,
        status: 'unread',
        isStarred: false,
        isArchived: false,
        createdAt: new Date().toISOString()
      }

      if (replyTo) {
        messageData.subject = `Re: ${replyTo.subject}`
      }

      await push(ref(db, 'messages'), messageData)
      toast.success('메시지가 전송되었습니다.')

      handleCloseCompose()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('메시지 전송 중 오류가 발생했습니다.')
    }
  }

  const handleView = async (message: Message) => {
    setSelectedMessage(message)

    // 읽음 처리
    if (message.toId === user?.uid && message.status === 'unread') {
      const db = getDatabase(app)
      await update(ref(db, `messages/${message.id}`), {
        status: 'read',
        readAt: new Date().toISOString()
      })
    }
  }

  const handleStar = async (messageId: string) => {
    const db = getDatabase(app)
    const message = messages.find(m => m.id === messageId)
    if (message) {
      await update(ref(db, `messages/${messageId}`), {
        isStarred: !message.isStarred
      })
    }
  }

  const handleArchive = async (messageId: string) => {
    const db = getDatabase(app)
    await update(ref(db, `messages/${messageId}`), {
      isArchived: true
    })
    toast.success('메시지가 보관되었습니다.')
    setSelectedMessage(null)
  }

  const handleReply = (message: Message) => {
    setReplyTo(message)
    setFormData({
      ...formData,
      toEmail: message.fromEmail,
      subject: `Re: ${message.subject}`
    })
    setShowCompose(true)
    setSelectedMessage(null)
  }

  const handleCloseCompose = () => {
    setShowCompose(false)
    setReplyTo(null)
    setFormData({
      subject: '',
      content: '',
      type: 'general',
      priority: 'normal',
      toEmail: ''
    })
  }

  const getUnreadCount = () => {
    return messages.filter(m => m.toId === user?.uid && m.status === 'unread').length
  }

  const unreadCount = getUnreadCount()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">메시지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">메시지</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 메시지가 있습니다` : '모든 메시지를 확인했습니다'}
          </p>
        </div>

        <Button onClick={() => setShowCompose(true)}>
          <Send className="mr-2 h-4 w-4" />
          메시지 작성
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 메시지</p>
                <p className="text-2xl font-bold">{messages.length}</p>
              </div>
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">읽지 않음</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">중요</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {messages.filter(m => m.isStarred).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">답장함</p>
                <p className="text-2xl font-bold text-green-600">
                  {messages.filter(m => m.status === 'replied').length}
                </p>
              </div>
              <Reply className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="메시지 검색..."
            className="pl-10"
          />
        </div>

        <Tabs value={filterType} onValueChange={setFilterType}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="unread">읽지않음</TabsTrigger>
            <TabsTrigger value="starred">중요</TabsTrigger>
            <TabsTrigger value="project">프로젝트</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 메시지 목록 */}
      {filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">메시지가 없습니다</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all'
                ? '다른 검색 조건을 시도해보세요.'
                : '받은 메시지가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map((message) => {
            const TypeIcon = CHANNEL_TYPES[message.type as keyof typeof CHANNEL_TYPES]?.icon || Hash
            const isUnread = message.toId === user?.uid && message.status === 'unread'
            const isSent = message.fromId === user?.uid

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card
                  className={`hover:shadow-md transition-all cursor-pointer ${isUnread ? 'border-primary bg-primary/5' : ''
                    }`}
                  onClick={() => handleView(message)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar>
                          <AvatarFallback>
                            {isSent ? message.toName[0] : message.fromName[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium truncate ${isUnread ? 'font-semibold' : ''}`}>
                              {message.subject}
                            </h3>
                            {message.priority !== 'normal' && (
                              <Badge variant={priorityConfig[message.priority].variant}>
                                {priorityConfig[message.priority].label}
                              </Badge>
                            )}
                            <Badge variant="outline" className="ml-auto">
                              {CHANNEL_TYPES[message.type as keyof typeof CHANNEL_TYPES]?.icon &&
                                React.createElement(CHANNEL_TYPES[message.type as keyof typeof CHANNEL_TYPES].icon, { className: "h-3 w-3 mr-1" })
                              }
                              {CHANNEL_TYPES[message.type as keyof typeof CHANNEL_TYPES]?.label || message.type}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <span className="font-medium">
                              {isSent ? `받는 사람: ${message.toName}` : message.fromName}
                            </span>
                            <span>•</span>
                            <span>{message.fromEmail}</span>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {message.content}
                          </p>

                          {message.projectName && (
                            <div className="flex items-center gap-1 mt-2">
                              <Building2 className="h-3 w-3" />
                              <span className="text-xs text-muted-foreground">{message.projectName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStar(message.id)
                          }}
                        >
                          <Star className={`h-4 w-4 ${message.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>

                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {isUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* 메시지 작성 모달 */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {replyTo ? `답장: ${replyTo.subject}` : '새 메시지'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSend}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="to">받는 사람</Label>
                <Input
                  id="to"
                  type="email"
                  value={formData.toEmail}
                  onChange={(e) => setFormData({ ...formData, toEmail: e.target.value })}
                  placeholder="이메일 주소"
                  required
                />
              </div>

              {!replyTo && (
                <div>
                  <Label htmlFor="subject">제목</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">유형</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="general">일반</option>
                    <option value="project">프로젝트</option>
                    <option value="support">지원</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="priority">우선순위</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="low">낮음</option>
                    <option value="normal">보통</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseCompose}>
                취소
              </Button>
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                전송
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 메시지 상세 모달 */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMessage(null)}>
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedMessage.subject}</CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant={priorityConfig[selectedMessage.priority].variant}>
                      {priorityConfig[selectedMessage.priority].label}
                    </Badge>
                    <Badge variant="outline">
                      {CHANNEL_TYPES[selectedMessage.type as keyof typeof CHANNEL_TYPES]?.label || selectedMessage.type}
                    </Badge>
                    {selectedMessage.projectName && (
                      <Badge variant="secondary">{selectedMessage.projectName}</Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>{selectedMessage.fromName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{selectedMessage.fromName}</h4>
                      <span className="text-sm text-muted-foreground">&lt;{selectedMessage.fromEmail}&gt;</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      받는 사람: {selectedMessage.toName} &lt;{selectedMessage.toEmail}&gt;
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedMessage.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="whitespace-pre-wrap">{selectedMessage.content}</div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleReply(selectedMessage)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    답장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleArchive(selectedMessage.id)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    보관
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}