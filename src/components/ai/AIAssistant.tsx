'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIAssistantMessage } from '@/types/ai'
import { useAuth } from '@/lib/auth-context'
import { aiService } from '@/services/ai-service'

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
}

// AI 프롬프트 템플릿
const promptTemplates = [
  { icon: '📊', label: '프로젝트 분석', prompt: '현재 프로젝트의 진행 상황을 분석해주세요.' },
  { icon: '💡', label: '개선 제안', prompt: '프로젝트 효율성을 높일 수 있는 방법을 제안해주세요.' },
  { icon: '🚀', label: '성능 최적화', prompt: '시스템 성능을 개선할 수 있는 방법을 알려주세요.' },
  { icon: '📝', label: '문서 작성', prompt: '프로젝트 문서 작성을 도와주세요.' },
  { icon: '🐛', label: '버그 해결', prompt: '이 문제를 해결하는 방법을 알려주세요.' },
  { icon: '📅', label: '일정 계획', prompt: '프로젝트 일정을 최적화하는 방법을 제안해주세요.' },
  { icon: '💰', label: '예산 분석', prompt: '현재 예산 상황을 분석하고 최적화 방안을 제안해주세요.' },
  { icon: '🎯', label: '리스크 평가', prompt: '프로젝트의 잠재적 위험 요소를 분석해주세요.' },
]

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<AIAssistantMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '안녕하세요! CodeB AI 어시스턴트입니다. 프로젝트와 관련된 모든 질문에 답변해드릴 수 있습니다. 무엇을 도와드릴까요?',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      // AI 컨텍스트 설정
      aiService.setContext({
        userRole: userProfile?.role,
        currentPage: window.location.pathname
      })
    }
  }, [isOpen, userProfile])

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: AIAssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // AI 응답 생성
    try {
      const startTime = Date.now()
      const aiResponse = await aiService.processMessage(userMessage.content)
      const processingTime = Date.now() - startTime

      const assistantMessage: AIAssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        metadata: {
          model: 'gpt-4',
          tokens: Math.floor(aiResponse.length / 4), // 대략적인 토큰 수
          processingTime,
        }
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: AIAssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTemplateClick = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                AI
              </div>
              <div>
                <h2 className="text-xl font-semibold">AI 어시스턴트</h2>
                <p className="text-sm text-gray-600">프로젝트 관련 모든 질문에 답변해드립니다</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[70%] rounded-2xl p-4
                  ${message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-900'
                  }
                `}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.metadata && (
                    <div className={`
                      text-xs mt-2 
                      ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}
                    `}>
                      {message.metadata.model} • {message.metadata.tokens} tokens • {message.metadata.processingTime}ms
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 rounded-2xl p-4">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-6 py-3 border-t">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {promptTemplates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateClick(template.prompt)}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors flex items-center gap-1"
                >
                  <span>{template.icon}</span>
                  <span>{template.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-6 border-t">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="질문을 입력하세요..."
                className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className={`
                  px-6 py-3 rounded-xl font-medium transition-all
                  ${input.trim() && !isTyping
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                전송
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}