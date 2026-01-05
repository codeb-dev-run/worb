'use client'
const isDev = process.env.NODE_ENV === 'development'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User, FileText, GraduationCap, Medal, Phone, Mail,
  Globe, Cake, Edit, ChevronRight, Loader2, Building2,
  Calendar, Heart, Users, Star, TrendingUp, Award
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { EmployeeProfile, EmployeeEducation, EmployeeExperience, EmployeeCertificate, MonthlyEvaluationSummary, YearlyEvaluationSummary, FlexWorkTier } from '@/types/hr'

const FLEX_TIER_LABELS: Record<FlexWorkTier, { label: string; color: string }> = {
  FULL_FLEX: { label: '완전자율', color: 'bg-emerald-500' },
  HIGH_FLEX: { label: '고유연', color: 'bg-blue-500' },
  MID_FLEX: { label: '중유연', color: 'bg-amber-500' },
  STANDARD: { label: '표준', color: 'bg-slate-500' },
}

interface ProfileTabProps {
  userId: string
  workspaceId: string
  isAdmin: boolean
}

export default function ProfileTab({ userId, workspaceId, isAdmin }: ProfileTabProps) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<EmployeeProfile>>({})
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [isEmployeeListOpen, setIsEmployeeListOpen] = useState(false)

  // 성과 점수
  const [monthlyScore, setMonthlyScore] = useState<MonthlyEvaluationSummary | null>(null)
  const [yearlyScore, setYearlyScore] = useState<YearlyEvaluationSummary | null>(null)
  const [recentWeeklyScore, setRecentWeeklyScore] = useState<number | null>(null)

  useEffect(() => {
    loadProfile()
    loadEvaluationScores()
    if (isAdmin) loadAllEmployees()
  }, [userId, workspaceId, isAdmin])

  useEffect(() => {
    if (selectedEmployee) {
      loadEvaluationScores(selectedEmployee)
    } else {
      loadEvaluationScores()
    }
  }, [selectedEmployee])

  const loadProfile = async (employeeId?: string) => {
    setLoading(true)
    try {
      const url = employeeId
        ? `/api/employees/${employeeId}`
        : '/api/employees/me'
      const res = await fetch(url, {
        headers: { 'x-workspace-id': workspaceId }
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.employee)
        setEditForm(data.employee || {})
      }
    } catch (e) {
      if (isDev) console.error('Failed to load profile:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadAllEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { 'x-workspace-id': workspaceId }
      })
      if (res.ok) {
        const data = await res.json()
        setAllEmployees(data.employees || [])
      }
    } catch (e) {
      if (isDev) console.error('Failed to load employees:', e)
    }
  }

  const loadEvaluationScores = async (employeeId?: string) => {
    try {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      const empParam = employeeId ? `&employeeId=${employeeId}` : ''

      // 주간 점수 (최근)
      const weeklyRes = await fetch(`/api/evaluation?workspaceId=${workspaceId}&type=weekly&year=${year}${empParam}`)
      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        const evaluations = data.evaluations || []
        if (evaluations.length > 0) {
          setRecentWeeklyScore(evaluations[0].totalScore)
        } else {
          setRecentWeeklyScore(null)
        }
      }

      // 월간 점수
      const monthlyRes = await fetch(`/api/evaluation?workspaceId=${workspaceId}&type=monthly&year=${year}&month=${month}${empParam}`)
      if (monthlyRes.ok) {
        const data = await monthlyRes.json()
        const evaluations = data.evaluations || []
        if (evaluations.length > 0) {
          setMonthlyScore(evaluations[0])
        } else {
          setMonthlyScore(null)
        }
      }

      // 연간 점수
      const yearlyRes = await fetch(`/api/evaluation?workspaceId=${workspaceId}&type=yearly&year=${year}${empParam}`)
      if (yearlyRes.ok) {
        const data = await yearlyRes.json()
        const evaluations = data.evaluations || []
        if (evaluations.length > 0) {
          setYearlyScore(evaluations[0])
        } else {
          setYearlyScore(null)
        }
      }
    } catch (e) {
      if (isDev) console.error('Failed to load evaluation scores:', e)
    }
  }

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployee(empId)
    setIsEmployeeListOpen(false)
    loadProfile(empId)
  }

  const handleBackToMyProfile = () => {
    setSelectedEmployee(null)
    loadProfile()
    toast.success('본인 인사기록으로 돌아왔습니다')
  }

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/employees/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.employee)
        setIsEditing(false)
        toast.success('프로필이 저장되었습니다')
      } else {
        toast.error('저장 실패')
      }
    } catch (e) {
      toast.error('저장 중 오류가 발생했습니다')
    }
  }

  const getEmploymentTypeBadge = (type?: string) => {
    const map: Record<string, { color: string; text: string }> = {
      FULL_TIME: { color: 'bg-blue-100 text-blue-700', text: '정규직' },
      PART_TIME: { color: 'bg-purple-100 text-purple-700', text: '파트타임' },
      CONTRACT: { color: 'bg-yellow-100 text-yellow-700', text: '계약직' },
      INTERN: { color: 'bg-green-100 text-green-700', text: '인턴' }
    }
    const v = map[type || ''] || { color: 'bg-slate-100 text-slate-600', text: type || '-' }
    return <Badge className={v.color}>{v.text}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 관리자: 직원 선택 */}
      {isAdmin && (
        <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Users className="w-5 h-5 text-lime-600" />
                <span className="text-slate-600">
                  {selectedEmployee ? '선택된 직원의 인사기록을 보고 있습니다' : '본인 인사기록'}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedEmployee && (
                  <Button variant="outline" size="sm" onClick={handleBackToMyProfile} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                    내 정보로 돌아가기
                  </Button>
                )}
                <Button size="sm" onClick={() => setIsEmployeeListOpen(true)} className="bg-black text-lime-400 hover:bg-black/90">
                  직원 선택
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 성과 점수 카드 */}
      <Card className="bg-gradient-to-br from-lime-50 via-emerald-50 to-teal-50 backdrop-blur-xl border-lime-200/60 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-lime-600" />
            성과 평가 점수
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 주간 점수 */}
            <div className="bg-white/70 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-2">
                <Calendar className="w-4 h-4" />
                최근 주간
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {recentWeeklyScore !== null ? recentWeeklyScore : '-'}
                <span className="text-lg text-slate-400 font-normal">/100</span>
              </div>
            </div>

            {/* 월간 점수 */}
            <div className="bg-white/70 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-2">
                <TrendingUp className="w-4 h-4" />
                이번 달 평균
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {monthlyScore ? monthlyScore.averageScore.toFixed(1) : '-'}
                <span className="text-lg text-slate-400 font-normal">/100</span>
              </div>
              {monthlyScore && (
                <Badge className={`mt-2 ${FLEX_TIER_LABELS[monthlyScore.flexWorkTier]?.color} text-white`}>
                  {FLEX_TIER_LABELS[monthlyScore.flexWorkTier]?.label}
                </Badge>
              )}
            </div>

            {/* 연간 점수 */}
            <div className="bg-white/70 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-2">
                <Award className="w-4 h-4" />
                올해 평균
              </div>
              <div className="text-3xl font-bold text-lime-600">
                {yearlyScore ? yearlyScore.averageScore.toFixed(1) : '-'}
                <span className="text-lg text-slate-400 font-normal">/100</span>
              </div>
              {yearlyScore && (
                <>
                  <Badge className={`mt-2 ${FLEX_TIER_LABELS[yearlyScore.flexWorkTier]?.color} text-white`}>
                    {FLEX_TIER_LABELS[yearlyScore.flexWorkTier]?.label}
                  </Badge>
                  {yearlyScore.suggestedRaisePercent && yearlyScore.suggestedRaisePercent > 0 && (
                    <div className="mt-2 text-xs text-emerald-600 font-medium">
                      권장 인상률: +{yearlyScore.suggestedRaisePercent}%
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 분기별 점수 (연간 데이터가 있을 때만) */}
          {yearlyScore && (yearlyScore.q1Average || yearlyScore.q2Average || yearlyScore.q3Average || yearlyScore.q4Average) && (
            <div className="mt-4 pt-4 border-t border-lime-200/50">
              <p className="text-sm text-slate-500 mb-2">분기별 평균</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-white/50 rounded-xl p-2">
                  <div className="text-slate-500">Q1</div>
                  <div className="font-bold text-slate-900">{yearlyScore.q1Average?.toFixed(1) || '-'}</div>
                </div>
                <div className="bg-white/50 rounded-xl p-2">
                  <div className="text-slate-500">Q2</div>
                  <div className="font-bold text-slate-900">{yearlyScore.q2Average?.toFixed(1) || '-'}</div>
                </div>
                <div className="bg-white/50 rounded-xl p-2">
                  <div className="text-slate-500">Q3</div>
                  <div className="font-bold text-slate-900">{yearlyScore.q3Average?.toFixed(1) || '-'}</div>
                </div>
                <div className="bg-white/50 rounded-xl p-2">
                  <div className="text-slate-500">Q4</div>
                  <div className="font-bold text-slate-900">{yearlyScore.q4Average?.toFixed(1) || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {!recentWeeklyScore && !monthlyScore && !yearlyScore && (
            <div className="text-center py-4 text-slate-500">
              아직 평가 기록이 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 기본 정보 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-lime-600" />
            기본 정보
          </CardTitle>
          {!selectedEmployee && (
            <Button size="sm" onClick={() => setIsEditing(true)} className="bg-black text-lime-400 hover:bg-black/90">
              <Edit className="w-4 h-4 mr-2" />
              수정
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoItem icon={<User />} label="이름 (한글)" value={profile?.nameKor} />
            <InfoItem icon={<Globe />} label="이름 (영문)" value={profile?.nameEng} />
            <InfoItem icon={<Mail />} label="이메일" value={profile?.email} />
            <InfoItem icon={<Phone />} label="휴대폰" value={profile?.mobile} />
            <InfoItem icon={<Cake />} label="생년월일" value={profile?.birthDate} />
            <InfoItem icon={<User />} label="성별" value={profile?.gender === 'male' ? '남성' : profile?.gender === 'female' ? '여성' : '-'} />
          </div>
        </CardContent>
      </Card>

      {/* 고용 정보 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            고용 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InfoItem icon={<FileText />} label="사번" value={profile?.employeeNumber} />
            <InfoItem icon={<Building2 />} label="부서" value={profile?.department} />
            <InfoItem icon={<User />} label="직책" value={profile?.position} />
            <InfoItem icon={<User />} label="직무" value={profile?.jobTitle} />
            <InfoItem icon={<Calendar />} label="입사일" value={profile?.hireDate} />
            <div className="p-3 rounded-xl bg-white/50">
              <span className="text-slate-500 text-sm">고용형태</span>
              <div className="mt-1">{getEmploymentTypeBadge(profile?.employmentType)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 학력 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            학력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profile?.education?.length ? (
            <p className="text-slate-500 text-center py-4">학력 정보가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {profile.education.map((edu, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/50 border border-white/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-slate-900 font-medium">{edu.school}</h4>
                      <p className="text-slate-600 text-sm">{edu.degree} / {edu.major}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                        {edu.status === 'graduated' ? '졸업' : edu.status === 'enrolled' ? '재학' : '중퇴'}
                      </Badge>
                      {edu.graduationDate && (
                        <p className="text-slate-500 text-xs mt-1">{edu.graduationDate}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 경력 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            경력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profile?.experience?.length ? (
            <p className="text-slate-500 text-center py-4">경력 정보가 없습니다</p>
          ) : (
            <div className="space-y-3">
              {profile.experience.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/50 border border-white/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-slate-900 font-medium">{exp.company}</h4>
                      <p className="text-slate-600 text-sm">{exp.position}</p>
                      {exp.description && <p className="text-slate-500 text-xs mt-1">{exp.description}</p>}
                    </div>
                    <p className="text-slate-500 text-sm">
                      {exp.startDate} ~ {exp.endDate || '현재'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 자격증 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-600" />
            자격증
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profile?.certificates?.length ? (
            <p className="text-slate-500 text-center py-4">자격증 정보가 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profile.certificates.map((cert, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/50 border border-white/60">
                  <h4 className="text-slate-900 font-medium">{cert.name}</h4>
                  <p className="text-slate-600 text-sm">{cert.issuer}</p>
                  <p className="text-slate-500 text-xs mt-1">취득일: {cert.issueDate}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 긴급 연락처 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            긴급 연락처
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!profile?.emergencyContact?.name ? (
            <p className="text-slate-500 text-center py-4">긴급 연락처가 등록되지 않았습니다</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoItem icon={<User />} label="이름" value={profile.emergencyContact.name} />
              <InfoItem icon={<Heart />} label="관계" value={profile.emergencyContact.relationship} />
              <InfoItem icon={<Phone />} label="연락처" value={profile.emergencyContact.phone} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 직원 목록 모달 */}
      <Dialog open={isEmployeeListOpen} onOpenChange={setIsEmployeeListOpen}>
        <DialogContent className="bg-white border-slate-200 max-w-lg max-h-[70vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">직원 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {allEmployees.map(emp => (
              <div
                key={emp.id}
                onClick={() => handleSelectEmployee(emp.id)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="text-slate-900 font-medium">{emp.nameKor}</p>
                  <p className="text-slate-600 text-sm">{emp.department} / {emp.position}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 수정 모달 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">프로필 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">이름 (한글)</Label>
                <Input
                  value={editForm.nameKor || ''}
                  onChange={e => setEditForm({ ...editForm, nameKor: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-600">이름 (영문)</Label>
                <Input
                  value={editForm.nameEng || ''}
                  onChange={e => setEditForm({ ...editForm, nameEng: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">휴대폰</Label>
                <Input
                  value={editForm.mobile || ''}
                  onChange={e => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-600">생년월일</Label>
                <Input
                  type="date"
                  value={editForm.birthDate || ''}
                  onChange={e => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-600">주소</Label>
              <Input
                value={editForm.address || ''}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600">은행명</Label>
                <Input
                  value={editForm.bankName || ''}
                  onChange={e => setEditForm({ ...editForm, bankName: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-600">계좌번호</Label>
                <Input
                  value={editForm.accountNumber || ''}
                  onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })}
                  className="mt-1 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50">취소</Button>
            <Button onClick={handleSaveProfile} className="bg-black text-lime-400 hover:bg-black/90">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="p-3 rounded-xl bg-white/50">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
        <span className="w-4 h-4">{icon}</span>
        {label}
      </div>
      <p className="text-slate-900">{value || '-'}</p>
    </div>
  )
}
