'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Star, Users, TrendingUp, Award, Loader2, ChevronLeft, ChevronRight,
  UserPlus, UserMinus, Calendar, Target, CheckCircle, AlertCircle
} from 'lucide-react'
import {
  Evaluator, WeeklyEvaluation, MonthlyEvaluationSummary,
  YearlyEvaluationSummary, FlexWorkTier, EmployeeProfile
} from '@/types/hr'

interface EvaluationTabProps {
  userId: string
  workspaceId: string
  isAdmin: boolean
  adminLevel?: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | null  // 관리자 등급 (SUPER_ADMIN만 평가 입력 가능)
}

interface EvaluationFormData {
  projectQuality: number
  deadlineAdherence: number
  presentation: number
  collaboration: number
  selfInitiative: number
  feedback: string
}

const FLEX_TIER_LABELS: Record<FlexWorkTier, { label: string; color: string; description: string }> = {
  FULL_FLEX: { label: '자유', color: 'bg-emerald-500', description: '80점 이상 - 근무 자율권' },
  HIGH_FLEX: { label: '자유', color: 'bg-emerald-500', description: '80점 이상' },
  MID_FLEX: { label: '집중케어', color: 'bg-amber-500', description: '80점 미만' },
  STANDARD: { label: '집중케어 주', color: 'bg-rose-500', description: '80점 미만 - 집중 관리' },
}

// 점수에 따른 등급 판정 (80점 기준)
const getFlexTierFromScore = (score: number): { tier: FlexWorkTier; label: string; color: string } => {
  if (score >= 80) {
    return { tier: 'FULL_FLEX', label: '자유', color: 'bg-emerald-500' }
  }
  return { tier: 'STANDARD', label: '집중케어 주', color: 'bg-rose-500' }
}

const CRITERIA_LABELS = {
  projectQuality: '프로젝트 품질',
  deadlineAdherence: '마감 준수',
  presentation: '프레젠테이션',
  collaboration: '협업',
  selfInitiative: '자기주도성',
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekDates(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const start = new Date(simple)
  if (dow <= 4) {
    start.setDate(simple.getDate() - dow + 1)
  } else {
    start.setDate(simple.getDate() + 8 - dow)
  }
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

export default function EvaluationTab({ userId, workspaceId, isAdmin, adminLevel }: EvaluationTabProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeView, setActiveView] = useState<'evaluate' | 'evaluators' | 'my-scores'>('my-scores')

  // SUPER_ADMIN만 평가 입력 가능
  const canInputEvaluation = adminLevel === 'SUPER_ADMIN'

  // 평가권한자 관련
  const [evaluators, setEvaluators] = useState<Evaluator[]>([])
  const [isEvaluator, setIsEvaluator] = useState(false)
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([])

  // 평가 입력 관련
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(new Date()))
  const [formData, setFormData] = useState<EvaluationFormData>({
    projectQuality: 15,
    deadlineAdherence: 15,
    presentation: 15,
    collaboration: 15,
    selfInitiative: 15,
    feedback: '',
  })

  // 기존 평가 데이터
  const [weeklyEvaluations, setWeeklyEvaluations] = useState<WeeklyEvaluation[]>([])
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyEvaluationSummary[]>([])
  const [yearlySummaries, setYearlySummaries] = useState<YearlyEvaluationSummary[]>([])

  const currentWeekDates = useMemo(() => getWeekDates(selectedYear, selectedWeek), [selectedYear, selectedWeek])
  const totalScore = useMemo(() =>
    formData.projectQuality + formData.deadlineAdherence + formData.presentation +
    formData.collaboration + formData.selfInitiative, [formData])

  useEffect(() => {
    loadData()
  }, [workspaceId])

  useEffect(() => {
    if (selectedEmployee && isEvaluator) {
      loadExistingEvaluation()
    }
  }, [selectedEmployee, selectedYear, selectedWeek])

  const loadData = async () => {
    setLoading(true)
    try {
      // 평가권한자 목록 조회
      const evalRes = await fetch(`/api/evaluation/evaluators?workspaceId=${workspaceId}`)
      if (evalRes.ok) {
        const evalData = await evalRes.json()
        setEvaluators(evalData.evaluators || [])
        setIsEvaluator(evalData.isEvaluator || false)
      }

      // 직원 목록 조회
      const empRes = await fetch(`/api/employee?workspaceId=${workspaceId}`)
      if (empRes.ok) {
        const empData = await empRes.json()
        setEmployees(empData.employees || [])
      }

      // 워크스페이스 멤버 목록 (평가권한자 추가용)
      if (isAdmin) {
        const memberRes = await fetch(`/api/workspace/${workspaceId}/members`)
        if (memberRes.ok) {
          const memberData = await memberRes.json()
          setWorkspaceMembers(memberData.members || [])
        }
      }

      // 내 점수 조회
      await loadMyScores()
    } catch (error) {
      console.error('Failed to load evaluation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyScores = async () => {
    try {
      const year = new Date().getFullYear()

      // 주간 평가
      const weeklyRes = await fetch(`/api/evaluation?workspaceId=${workspaceId}&type=weekly&year=${year}`)
      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        setWeeklyEvaluations(data.evaluations || [])
      }

      // 월간 요약
      const monthlyRes = await fetch(`/api/evaluation?workspaceId=${workspaceId}&type=monthly&year=${year}`)
      if (monthlyRes.ok) {
        const data = await monthlyRes.json()
        setMonthlySummaries(data.evaluations || [])
      }

      // 연간 요약
      const yearlyRes = await fetch(`/api/evaluation?workspaceId=${workspaceId}&type=yearly&year=${year}`)
      if (yearlyRes.ok) {
        const data = await yearlyRes.json()
        setYearlySummaries(data.evaluations || [])
      }
    } catch (error) {
      console.error('Failed to load scores:', error)
    }
  }

  const loadExistingEvaluation = async () => {
    try {
      const res = await fetch(
        `/api/evaluation?workspaceId=${workspaceId}&type=weekly&year=${selectedYear}&week=${selectedWeek}&employeeId=${selectedEmployee}`
      )
      if (res.ok) {
        const data = await res.json()
        const existing = data.evaluations?.[0]
        if (existing) {
          setFormData({
            projectQuality: existing.projectQuality,
            deadlineAdherence: existing.deadlineAdherence,
            presentation: existing.presentation,
            collaboration: existing.collaboration,
            selfInitiative: existing.selfInitiative,
            feedback: existing.feedback || '',
          })
        } else {
          // 기존 평가 없으면 기본값으로 리셋 (기본 75점 = 15점씩)
          setFormData({
            projectQuality: 15,
            deadlineAdherence: 15,
            presentation: 15,
            collaboration: 15,
            selfInitiative: 15,
            feedback: '',
          })
        }
      }
    } catch (error) {
      console.error('Failed to load existing evaluation:', error)
    }
  }

  const handleSubmitEvaluation = async () => {
    if (!selectedEmployee) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/evaluation/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          employeeId: selectedEmployee,
          year: selectedYear,
          weekNumber: selectedWeek,
          ...formData,
        }),
      })

      if (res.ok) {
        alert('평가가 저장되었습니다.')
        await loadMyScores()
      } else {
        const error = await res.json()
        alert(error.error || '평가 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to submit evaluation:', error)
      alert('평가 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddEvaluator = async (userIdToAdd: string) => {
    try {
      const res = await fetch('/api/evaluation/evaluators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, userId: userIdToAdd }),
      })

      if (res.ok) {
        await loadData()
      } else {
        const error = await res.json()
        alert(error.error || '평가권한자 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to add evaluator:', error)
    }
  }

  const handleRemoveEvaluator = async (evaluatorId: string) => {
    if (!confirm('이 사용자의 평가 권한을 해제하시겠습니까?')) return

    try {
      const res = await fetch(
        `/api/evaluation/evaluators?workspaceId=${workspaceId}&evaluatorId=${evaluatorId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        await loadData()
      } else {
        const error = await res.json()
        alert(error.error || '평가권한자 해제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to remove evaluator:', error)
    }
  }

  const handleScoreChange = (field: keyof EvaluationFormData, value: number) => {
    if (field === 'feedback') return
    const clampedValue = Math.max(0, Math.min(20, value))
    setFormData(prev => ({ ...prev, [field]: clampedValue }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 서브 탭 */}
      <div className="bg-white/60 backdrop-blur-md p-1 rounded-xl border border-white/40 w-auto inline-flex">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'my-scores' ? 'bg-black text-lime-400' : 'text-slate-600 hover:bg-white/60'
          }`}
          onClick={() => setActiveView('my-scores')}
        >
          <Star className="w-4 h-4 inline mr-2" />
          내 점수
        </button>
        {canInputEvaluation && (
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'evaluate' ? 'bg-black text-lime-400' : 'text-slate-600 hover:bg-white/60'
            }`}
            onClick={() => setActiveView('evaluate')}
          >
            <Target className="w-4 h-4 inline mr-2" />
            평가 입력
          </button>
        )}
        {canInputEvaluation && (
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'evaluators' ? 'bg-black text-lime-400' : 'text-slate-600 hover:bg-white/60'
            }`}
            onClick={() => setActiveView('evaluators')}
          >
            <Users className="w-4 h-4 inline mr-2" />
            평가권한자 관리
          </button>
        )}
      </div>

      {/* 내 점수 보기 */}
      {activeView === 'my-scores' && (
        <div className="space-y-6">
          {/* 연간 요약 */}
          {yearlySummaries.length > 0 && (
            <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-lime-500" />
                  연간 성과 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {yearlySummaries.map(summary => (
                    <div key={summary.id} className="bg-white/80 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{summary.year}년</span>
                        <Badge className={`${FLEX_TIER_LABELS[summary.flexWorkTier]?.color} text-white`}>
                          {FLEX_TIER_LABELS[summary.flexWorkTier]?.label}
                        </Badge>
                      </div>
                      <div className="text-3xl font-bold text-lime-500">
                        {summary.averageScore.toFixed(1)}점
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-slate-500">
                        <div>Q1: {summary.q1Average?.toFixed(1) || '-'}</div>
                        <div>Q2: {summary.q2Average?.toFixed(1) || '-'}</div>
                        <div>Q3: {summary.q3Average?.toFixed(1) || '-'}</div>
                        <div>Q4: {summary.q4Average?.toFixed(1) || '-'}</div>
                      </div>
                      {summary.suggestedRaisePercent && (
                        <div className="text-sm text-emerald-600 font-medium">
                          권장 인상률: +{summary.suggestedRaisePercent}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 월간 요약 */}
          {monthlySummaries.length > 0 && (
            <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  월간 평가 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {monthlySummaries.map(summary => (
                    <div key={summary.id} className="bg-white/80 rounded-xl p-3 text-center">
                      <div className="text-sm text-slate-500">{summary.year}년 {summary.month}월</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">
                        {summary.averageScore.toFixed(1)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`mt-2 text-xs ${
                          summary.averageScore >= 80
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-rose-500 text-rose-600'
                        }`}
                      >
                        {summary.averageScore >= 80 ? '자유' : '집중케어'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 주간 평가 상세 */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                주간 평가 기록
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyEvaluations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  아직 받은 평가가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {weeklyEvaluations.map(evaluation => (
                    <div key={evaluation.id} className="bg-white/80 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-medium">
                            {evaluation.year}년 {evaluation.weekNumber}주차
                          </span>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {new Date(evaluation.weekStartDate).toLocaleDateString('ko-KR')} ~
                            {new Date(evaluation.weekEndDate).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-lime-500">{evaluation.totalScore}점</div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                          <div key={key} className="text-center">
                            <div className="text-slate-500">{label}</div>
                            <div className="font-medium text-slate-900">
                              {evaluation[key as keyof typeof CRITERIA_LABELS]}
                            </div>
                          </div>
                        ))}
                      </div>
                      {evaluation.feedback && (
                        <div className="mt-3 p-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                          {evaluation.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 평가 입력 (SUPER_ADMIN만) */}
      {activeView === 'evaluate' && canInputEvaluation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 직원 선택 */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
            <CardHeader>
              <CardTitle>직원 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp.id!)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedEmployee === emp.id
                      ? 'bg-lime-100 border-2 border-lime-400'
                      : 'bg-white/80 hover:bg-white border border-transparent'
                  }`}
                >
                  <div className="font-medium">{emp.nameKor}</div>
                  <div className="text-xs text-slate-500">{emp.position} · {emp.department}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* 주차 선택 & 평가 입력 */}
          <Card className="lg:col-span-2 bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>주간 평가 입력</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedWeek <= 1) {
                        setSelectedYear(y => y - 1)
                        setSelectedWeek(52)
                      } else {
                        setSelectedWeek(w => w - 1)
                      }
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {selectedYear}년 {selectedWeek}주차
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedWeek >= 52) {
                        setSelectedYear(y => y + 1)
                        setSelectedWeek(1)
                      } else {
                        setSelectedWeek(w => w + 1)
                      }
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {currentWeekDates.start.toLocaleDateString('ko-KR')} ~ {currentWeekDates.end.toLocaleDateString('ko-KR')}
              </p>
            </CardHeader>
            <CardContent>
              {!selectedEmployee ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  평가할 직원을 선택해주세요
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 점수 입력 */}
                  <div className="grid grid-cols-5 gap-4">
                    {(Object.keys(CRITERIA_LABELS) as Array<keyof typeof CRITERIA_LABELS>).map(key => (
                      <div key={key} className="text-center">
                        <label className="block text-xs text-slate-600 mb-2">{CRITERIA_LABELS[key]}</label>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={formData[key as keyof EvaluationFormData]}
                          onChange={(e) => handleScoreChange(key as keyof EvaluationFormData, parseInt(e.target.value) || 0)}
                          className="text-center font-bold text-lg"
                        />
                        <span className="text-xs text-slate-400">/20</span>
                      </div>
                    ))}
                  </div>

                  {/* 총점 표시 - 80점 기준 자유/집중케어 */}
                  <div className="flex justify-center items-center gap-4 py-4 bg-gradient-to-r from-lime-50 to-emerald-50 rounded-2xl">
                    <div className={`text-4xl font-bold ${totalScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalScore}
                    </div>
                    <div className="text-slate-500">/ 100점</div>
                    <Badge className={`${totalScore >= 80 ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                      {totalScore >= 80 ? '자유' : '집중케어 주'}
                    </Badge>
                  </div>
                  {totalScore < 80 && (
                    <div className="text-center text-sm text-rose-600 bg-rose-50 rounded-xl py-2">
                      ⚠️ 80점 미만: 해당 주 집중 관리 대상
                    </div>
                  )}

                  {/* 피드백 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">피드백 (선택)</label>
                    <Textarea
                      value={formData.feedback}
                      onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
                      placeholder="직원에게 전달할 피드백을 작성해주세요..."
                      rows={3}
                    />
                  </div>

                  {/* 저장 버튼 */}
                  <Button
                    onClick={handleSubmitEvaluation}
                    disabled={submitting}
                    className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    평가 저장
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 평가권한자 관리 (SUPER_ADMIN만) */}
      {activeView === 'evaluators' && canInputEvaluation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 현재 평가권한자 */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-lime-500" />
                현재 평가권한자
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evaluators.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  등록된 평가권한자가 없습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {evaluators.map(evaluator => (
                    <div key={evaluator.id} className="flex items-center justify-between p-3 bg-white/80 rounded-xl">
                      <div className="flex items-center gap-3">
                        {evaluator.user.avatar ? (
                          <img src={evaluator.user.avatar} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-lime-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{evaluator.user.name}</div>
                          <div className="text-xs text-slate-500">{evaluator.user.email}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEvaluator(evaluator.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 평가권한자 추가 */}
          <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                평가권한자 추가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {workspaceMembers
                  .filter(m => !evaluators.some(e => e.userId === m.userId))
                  .map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-white/80 rounded-xl">
                      <div className="flex items-center gap-3">
                        {member.user?.avatar ? (
                          <img src={member.user.avatar} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{member.user?.name || member.user?.email}</div>
                          <div className="text-xs text-slate-500">{member.role}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddEvaluator(member.userId)}
                        className="text-lime-600 border-lime-400 hover:bg-lime-50"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        추가
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
