'use client'
const isDev = process.env.NODE_ENV === 'development'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings, Clock, DollarSign, CalendarDays,
  Shield, RotateCcw, Save
} from 'lucide-react'
import {
  HRSystemSettings, QuickSetupConfig
} from '@/types/hr'
import { QuickSetupWizard } from './settings/QuickSetupWizard'
import { WorkSettingsSection } from './settings/WorkSettingsSection'
import { PayrollSettingsSection } from './settings/PayrollSettingsSection'
import { LeaveSettingsSection } from './settings/LeaveSettingsSection'
import { RBACSettingsSection } from './settings/RBACSettingsSection'

interface SettingsTabProps {
  userId: string
  workspaceId: string
  isAdmin: boolean
  mode: 'quick' | 'advanced'
}

// 기본 설정값 (2025 한국 근로기준법 기준)
const DEFAULT_SETTINGS: HRSystemSettings = {
  workspaceId: '',
  setupMode: 'QUICK',
  quickSetup: {
    step: 1,
    country: 'KR',
    workType: 'FIXED',
    remoteWorkEnabled: false,
    gpsVerification: false,
    wifiVerification: false,
    hourlyWorkerEnabled: false,
    leavePolicy: 'LEGAL_STANDARD',
    status: 'DRAFT'
  },
  workSettings: {
    workSchedule: {
      type: 'FIXED',
      dailyRequiredMinutes: 480, // 8시간
      weeklyRequiredHours: 40,
      workStartTime: '09:00',
      workEndTime: '18:00',
      lunchBreakMinutes: 60,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00'
    },
    verification: {
      presenceCheckEnabled: false,
      presenceIntervalMinutes: 60,
      gpsEnabled: false,
      gpsRadius: 100,
      wifiEnabled: false,
      officeIpWhitelist: [],
      officeWifiSSIDs: []
    },
    latePolicy: {
      graceMinutes: 10,
      deductionPerLate: 0,
      maxLatePerMonth: 3
    }
  },
  payrollSettings: {
    baseSalary: {
      type: 'MONTHLY',
      standardWorkingHoursPerMonth: 209
    },
    overtimeMultipliers: {
      overtime: 1.5,
      night: 1.5,
      holiday: 1.5,
      holidayOvertime: 2.0
    },
    fixedAllowances: [],
    deductions: [
      { id: '1', name: '국민연금', type: 'RATE', value: 0.045, description: '4.5%' },
      { id: '2', name: '건강보험', type: 'RATE', value: 0.0354, description: '3.54%' },
      { id: '3', name: '장기요양보험', type: 'RATE', value: 0.00454, description: '건강보험의 12.81%' },
      { id: '4', name: '고용보험', type: 'RATE', value: 0.009, description: '0.9%' },
      { id: '5', name: '소득세', type: 'RATE', value: 0.033, description: '간이세액표 기준' },
      { id: '6', name: '지방소득세', type: 'RATE', value: 0.0033, description: '소득세의 10%' }
    ]
  },
  leavePolicy: {
    annualLeave: {
      type: 'LEGAL_STANDARD',
      firstYearDays: 11, // 월 1일씩 발생 (법정)
      afterFirstYearDays: 15,
      maxAccumulatedDays: 25,
      carryOverEnabled: true,
      carryOverMaxDays: 10,
      expiryMonths: 12
    },
    sickLeave: {
      paidDays: 3,
      requiresDocument: true,
      documentAfterDays: 3
    },
    specialLeave: {
      marriage: 5,
      bereavement: 5,
      childBirth: 10,
      familyCare: 10
    },
    approvalProcess: {
      autoApproveUnder: 1,
      requireManagerApproval: true,
      requireHRApproval: false
    }
  },
  rbacSettings: {
    roles: [
      {
        id: '1', name: 'CEO', nameKor: '대표', permissions: [
          { module: 'ATTENDANCE', actions: ['VIEW', 'APPROVE'] },
          { module: 'LEAVE', actions: ['VIEW', 'APPROVE'] },
          { module: 'PAYROLL', actions: ['VIEW', 'APPROVE'] },
          { module: 'HR_RECORD', actions: ['VIEW'] },
          { module: 'SETTINGS', actions: ['VIEW', 'EDIT', 'APPROVE'] },
          { module: 'APPROVAL', actions: ['VIEW', 'APPROVE'] }
        ]
      },
      {
        id: '2', name: 'HR_ADMIN', nameKor: 'HR 관리자', permissions: [
          { module: 'ATTENDANCE', actions: ['VIEW', 'CREATE', 'EDIT'] },
          { module: 'LEAVE', actions: ['VIEW', 'CREATE', 'EDIT', 'APPROVE'] },
          { module: 'PAYROLL', actions: ['VIEW', 'CREATE', 'EDIT'] },
          { module: 'HR_RECORD', actions: ['VIEW', 'CREATE', 'EDIT'] },
          { module: 'SETTINGS', actions: ['VIEW', 'EDIT'] }
        ]
      },
      {
        id: '3', name: 'MANAGER', nameKor: '팀장', permissions: [
          { module: 'ATTENDANCE', actions: ['VIEW'] },
          { module: 'LEAVE', actions: ['VIEW', 'APPROVE'] },
          { module: 'APPROVAL', actions: ['VIEW', 'APPROVE'] }
        ]
      },
      {
        id: '4', name: 'EMPLOYEE', nameKor: '직원', permissions: [
          { module: 'ATTENDANCE', actions: ['VIEW', 'CREATE'] },
          { module: 'LEAVE', actions: ['VIEW', 'CREATE'] },
          { module: 'PAYROLL', actions: ['VIEW'] }
        ]
      }
    ]
  },
  policyVersion: '1.0.0',
  policyStatus: 'DRAFT',
  effectiveFrom: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export default function SettingsTab({ workspaceId, isAdmin, mode }: SettingsTabProps) {
  const [settings, setSettings] = useState<HRSystemSettings>({ ...DEFAULT_SETTINGS, workspaceId })
  const [quickStep, setQuickStep] = useState(1)
  const [activeSection, setActiveSection] = useState<'work' | 'payroll' | 'leave' | 'rbac'>('work')
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  // 퀵설정 단계 정의 (job.md 3.1 기반)
  const quickSteps = [
    { step: 1, title: '국가 선택', description: '근로기준법 적용 국가' },
    { step: 2, title: '근무형태', description: '기본 근무 방식 선택' },
    { step: 3, title: '재택근무', description: 'GPS/WiFi 인증 설정' },
    { step: 4, title: '알바 사용', description: '시급제 정책 활성화' },
    { step: 5, title: '연차 정책', description: '휴가 발생 기준' },
    { step: 6, title: '요약 확인', description: '설정 검토 및 적용' }
  ]

  const handleSettingChange = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current: any = newSettings
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newSettings
    })
    setHasChanges(true)
  }

  const handleQuickSetupChange = (field: keyof QuickSetupConfig, value: any) => {
    setSettings(prev => ({
      ...prev,
      quickSetup: { ...prev.quickSetup!, [field]: value }
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: API 호출
      if (isDev) console.log('Saving settings:', settings)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setHasChanges(false)
      alert('설정이 저장되었습니다.')
    } catch (error) {
      if (isDev) console.error('Failed to save settings:', error)
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      setSettings({ ...DEFAULT_SETTINGS, workspaceId })
      setHasChanges(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">접근 권한 없음</h3>
          <p className="text-slate-500">HR 설정은 관리자만 수정할 수 있습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 모드 선택 헤더 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-lime-400/20 rounded-2xl">
                <Settings className="w-6 h-6 text-lime-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">HR 시스템 설정</h2>
                <p className="text-sm text-slate-500">
                  근태, 급여, 휴가 정책을 설정합니다
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.policyStatus === 'ACTIVE' ? 'default' : 'secondary'}
                className={settings.policyStatus === 'ACTIVE' ? 'bg-lime-400 text-black' : ''}>
                {settings.policyStatus === 'ACTIVE' ? '적용중' :
                  settings.policyStatus === 'PENDING_APPROVAL' ? '승인대기' : '초안'}
              </Badge>
              <span className="text-xs text-slate-400">v{settings.policyVersion}</span>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* 퀵설정 모드 */}
      {mode === 'quick' && (
        <QuickSetupWizard
          settings={settings}
          quickStep={quickStep}
          setQuickStep={setQuickStep}
          quickSteps={quickSteps}
          handleQuickSetupChange={handleQuickSetupChange}
          handleSettingChange={handleSettingChange}
        />
      )}

      {/* 고급 모드 */}
      {mode === 'advanced' && (
        <AdvancedSettings
          settings={settings}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          handleSettingChange={handleSettingChange}
        />
      )}

      {/* 저장/초기화 버튼 */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-slate-200"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          초기화
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="bg-black text-lime-400 hover:bg-black/90"
        >
          {saving ? (
            <>저장 중...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// 고급 설정 컴포넌트
function AdvancedSettings({
  settings,
  activeSection,
  setActiveSection,
  handleSettingChange
}: {
  settings: HRSystemSettings
  activeSection: 'work' | 'payroll' | 'leave' | 'rbac'
  setActiveSection: (s: 'work' | 'payroll' | 'leave' | 'rbac') => void
  handleSettingChange: (path: string, value: any) => void
}) {
  const sections = [
    { id: 'work' as const, label: '근무 설정', icon: Clock },
    { id: 'payroll' as const, label: '급여 설정', icon: DollarSign },
    { id: 'leave' as const, label: '휴가 정책', icon: CalendarDays },
    { id: 'rbac' as const, label: '권한 관리', icon: Shield }
  ]

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* 사이드 네비 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl col-span-1">
        <CardContent className="p-4">
          <div className="space-y-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all ${activeSection === section.id
                    ? 'bg-black text-lime-400'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 설정 콘텐츠 */}
      <Card className="bg-white/60 backdrop-blur-xl border-white/40 rounded-3xl col-span-3">
        <CardContent className="p-6">
          {activeSection === 'work' && (
            <WorkSettingsSection
              settings={settings.workSettings}
              onChange={handleSettingChange}
            />
          )}
          {activeSection === 'payroll' && (
            <PayrollSettingsSection
              settings={settings.payrollSettings}
              onChange={handleSettingChange}
            />
          )}
          {activeSection === 'leave' && (
            <LeaveSettingsSection
              settings={settings.leavePolicy}
              onChange={handleSettingChange}
            />
          )}
          {activeSection === 'rbac' && (
            <RBACSettingsSection
              settings={settings.rbacSettings}
              onChange={handleSettingChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
