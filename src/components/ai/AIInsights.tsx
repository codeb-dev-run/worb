'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiService, AIAnalysis } from '@/services/ai-service'
import { useAuth } from '@/lib/auth-context'

interface AIInsightsProps {
  projectId?: string
  compact?: boolean
}

export default function AIInsights({ projectId, compact = false }: AIInsightsProps) {
  const { user } = useAuth()
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'analysis' | 'prediction' | 'recommendations'>('analysis')

  useEffect(() => {
    loadInsights()
  }, [projectId])

  const loadInsights = async () => {
    setIsLoading(true)
    try {
      // 프로젝트 분석 로드 (예측 포함)
      const projectAnalysis = await aiService.analyzeProject(projectId || 'default')
      setAnalysis(projectAnalysis)
    } catch (error) {
      console.error('Failed to load AI insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(dateString))
    } catch (e) {
      return dateString
    }
  }

  const getConfidenceColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600'
    if (probability >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 데이터로부터 파생된 UI 헬퍼
  const getDerivedStatus = (analysis: AIAnalysis) => {
    const score = analysis.predictions.successProbability
    if (score >= 80) return { label: '안정적', color: 'bg-green-100 text-green-700', priority: 'low' }
    if (score >= 50) return { label: '주의 필요', color: 'bg-yellow-100 text-yellow-700', priority: 'medium' }
    return { label: '위험', color: 'bg-red-100 text-red-700', priority: 'high' }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">AI 인사이트</h3>
          <span className="text-2xl">🤖</span>
        </div>

        {analysis && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getDerivedStatus(analysis).color}`}>
                {getDerivedStatus(analysis).label}
              </span>
              <p className="text-sm font-medium text-gray-900">
                성공 확률 {analysis.predictions.successProbability}%
              </p>
            </div>

            <p className="text-sm text-gray-600">
              예상 완료일: {formatDate(analysis.predictions.completionDate)}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="text-center">
                <p className="text-xs text-gray-600">효율성</p>
                <p className="text-lg font-bold text-primary">{analysis.efficiency}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">품질</p>
                <p className="text-lg font-bold text-green-600">{analysis.quality}점</p>
              </div>
            </div>

            <button className="w-full btn btn-secondary text-sm mt-3">
              상세 분석 보기
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* 헤더 */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI 프로젝트 인사이트</h2>
            <p className="text-sm text-gray-600 mt-1">인공지능이 분석한 프로젝트 현황과 예측</p>
          </div>
          <button
            onClick={loadInsights}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="새로고침"
          >
            🔄
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b">
        <div className="flex">
          {[
            { id: 'analysis', label: '현황 분석', icon: '📊' },
            { id: 'prediction', label: '예측', icon: '🔮' },
            { id: 'recommendations', label: '권장사항', icon: '💡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'analysis' && analysis && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className={`px-3 py-1 text-sm rounded-full ${getDerivedStatus(analysis).color}`}>
                  {getDerivedStatus(analysis).label}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">종합 분석</h3>
                <p className="text-gray-600">
                  현재 프로젝트의 성공 확률은 {analysis.predictions.successProbability}%이며,
                  전반적인 효율성은 {analysis.efficiency}%, 품질 점수는 {analysis.quality}점입니다.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">품질</p>
                  <p className="text-xl font-bold text-gray-900">{analysis.quality}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">예산 사용</p>
                  <p className="text-xl font-bold text-gray-900">{analysis.budgetUsage}%</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">효율성</p>
                  <p className="text-xl font-bold text-gray-900">{analysis.efficiency}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">만족도</p>
                  <p className="text-xl font-bold text-gray-900">{analysis.satisfaction}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'prediction' && analysis && (
            <motion.div
              key="prediction"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">프로젝트 완료 예측</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">예상 완료일</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDate(analysis.predictions.completionDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">성공 확률</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${analysis.predictions.successProbability}%` }}
                        />
                      </div>
                      <span className={`font-bold ${getConfidenceColor(analysis.predictions.successProbability)}`}>
                        {analysis.predictions.successProbability}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">예상 예산</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {analysis.predictions.budgetForecast.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>

              {analysis.risks && analysis.risks.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">잠재적 위험 요소</h4>
                  <div className="space-y-2">
                    {analysis.risks.map((risk: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <span className="text-red-500">⚠️</span>
                        <p className="text-sm text-gray-700">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'recommendations' && analysis?.recommendations && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">AI 권장사항</h3>
                <p className="text-sm text-gray-600 mb-4">
                  프로젝트 성공을 위한 AI의 맞춤형 제안입니다.
                </p>
              </div>

              <div className="space-y-3">
                {analysis.recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                  >
                    <span className="text-xl flex-shrink-0">
                      {idx === 0 ? '🎯' : idx === 1 ? '📈' : '✨'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{rec}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}