'use client'

// ===========================================
// Features Tab Component (Admin Only)
// ===========================================

import React from 'react'
import {
  Save, AlertCircle, Loader2, Building, Kanban, Users, DollarSign,
  MessageSquare, Zap, Briefcase, BarChart3, FileText, Clock,
  CreditCard, Calendar, Megaphone, CheckCircle, Database
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { WorkspaceFeatureSettings } from '../types'

interface FeaturesTabProps {
  workspaceFeatures: WorkspaceFeatureSettings
  currentWorkspace: { id: string; name?: string; type?: string } | null
  hasFeatureChanges: boolean
  savingFeatures: boolean
  onUpdate: (field: keyof WorkspaceFeatureSettings, value: boolean) => void
  onSave: () => void
}

interface FeatureToggleProps {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function FeatureToggle({ icon: Icon, iconColor, label, checked, onCheckedChange }: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <Label className="cursor-pointer text-slate-700">{label}</Label>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function FeaturesTab({
  workspaceFeatures,
  currentWorkspace,
  hasFeatureChanges,
  savingFeatures,
  onUpdate,
  onSave
}: FeaturesTabProps) {
  return (
    <div className="space-y-4 mt-6">
      {/* Save button */}
      {hasFeatureChanges && (
        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-700 font-medium">변경사항이 있습니다</span>
          </div>
          <Button
            variant="limePrimary"
            onClick={onSave}
            disabled={savingFeatures}
            className="rounded-xl"
          >
            {savingFeatures ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            기능 설정 저장
          </Button>
        </div>
      )}

      {/* Workspace Info */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Building className="h-5 w-5 text-lime-600" />
            워크스페이스 정보
          </CardTitle>
          <CardDescription className="text-slate-500">
            현재 워크스페이스: <span className="font-semibold text-slate-700">{currentWorkspace?.name}</span>
            {currentWorkspace?.type && (
              <Badge className="ml-2" variant="outline">
                {currentWorkspace.type === 'ENTERPRISE' ? '엔터프라이즈' :
                 currentWorkspace.type === 'HR_ONLY' ? 'HR 전용' :
                 currentWorkspace.type === 'PROJECT_ONLY' ? '프로젝트 전용' : currentWorkspace.type}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Project Management */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Kanban className="h-5 w-5 text-violet-600" />
            프로젝트 관리
          </CardTitle>
          <CardDescription className="text-slate-500">프로젝트 및 작업 관리 기능을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureToggle icon={Briefcase} iconColor="text-violet-600" label="프로젝트 기능"
              checked={workspaceFeatures.projectEnabled} onCheckedChange={(v) => onUpdate('projectEnabled', v)} />
            <FeatureToggle icon={Kanban} iconColor="text-emerald-600" label="칸반 보드"
              checked={workspaceFeatures.kanbanEnabled} onCheckedChange={(v) => onUpdate('kanbanEnabled', v)} />
            <FeatureToggle icon={BarChart3} iconColor="text-blue-600" label="간트 차트"
              checked={workspaceFeatures.ganttEnabled} onCheckedChange={(v) => onUpdate('ganttEnabled', v)} />
            <FeatureToggle icon={FileText} iconColor="text-amber-600" label="파일 관리"
              checked={workspaceFeatures.filesEnabled} onCheckedChange={(v) => onUpdate('filesEnabled', v)} />
          </div>
        </CardContent>
      </Card>

      {/* HR Management */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            HR 관리
          </CardTitle>
          <CardDescription className="text-slate-500">인사 및 근태 관리 기능을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureToggle icon={Clock} iconColor="text-emerald-600" label="근태 관리"
              checked={workspaceFeatures.attendanceEnabled} onCheckedChange={(v) => onUpdate('attendanceEnabled', v)} />
            <FeatureToggle icon={Users} iconColor="text-blue-600" label="직원 관리"
              checked={workspaceFeatures.employeeEnabled} onCheckedChange={(v) => onUpdate('employeeEnabled', v)} />
            <FeatureToggle icon={CreditCard} iconColor="text-violet-600" label="급여 관리"
              checked={workspaceFeatures.payrollEnabled} onCheckedChange={(v) => onUpdate('payrollEnabled', v)} />
            <FeatureToggle icon={Calendar} iconColor="text-rose-600" label="휴가 관리"
              checked={workspaceFeatures.leaveEnabled} onCheckedChange={(v) => onUpdate('leaveEnabled', v)} />
            <FeatureToggle icon={Building} iconColor="text-slate-600" label="조직 관리"
              checked={workspaceFeatures.organizationEnabled} onCheckedChange={(v) => onUpdate('organizationEnabled', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Finance Management */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            재무 관리
          </CardTitle>
          <CardDescription className="text-slate-500">재무 및 경비 관리 기능을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureToggle icon={DollarSign} iconColor="text-amber-600" label="재무 기능"
              checked={workspaceFeatures.financeEnabled} onCheckedChange={(v) => onUpdate('financeEnabled', v)} />
            <FeatureToggle icon={CreditCard} iconColor="text-rose-600" label="경비 관리"
              checked={workspaceFeatures.expenseEnabled} onCheckedChange={(v) => onUpdate('expenseEnabled', v)} />
            <FeatureToggle icon={FileText} iconColor="text-blue-600" label="청구서 관리"
              checked={workspaceFeatures.invoiceEnabled} onCheckedChange={(v) => onUpdate('invoiceEnabled', v)} />
            <FeatureToggle icon={CreditCard} iconColor="text-violet-600" label="법인카드 관리"
              checked={workspaceFeatures.corporateCardEnabled} onCheckedChange={(v) => onUpdate('corporateCardEnabled', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Groupware */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            그룹웨어
          </CardTitle>
          <CardDescription className="text-slate-500">커뮤니케이션 및 협업 기능을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureToggle icon={Megaphone} iconColor="text-rose-600" label="공지사항"
              checked={workspaceFeatures.announcementEnabled} onCheckedChange={(v) => onUpdate('announcementEnabled', v)} />
            <FeatureToggle icon={FileText} iconColor="text-emerald-600" label="게시판"
              checked={workspaceFeatures.boardEnabled} onCheckedChange={(v) => onUpdate('boardEnabled', v)} />
            <FeatureToggle icon={Calendar} iconColor="text-blue-600" label="캘린더"
              checked={workspaceFeatures.calendarEnabled} onCheckedChange={(v) => onUpdate('calendarEnabled', v)} />
            <FeatureToggle icon={MessageSquare} iconColor="text-violet-600" label="메시지"
              checked={workspaceFeatures.messageEnabled} onCheckedChange={(v) => onUpdate('messageEnabled', v)} />
            <FeatureToggle icon={MessageSquare} iconColor="text-amber-600" label="채팅"
              checked={workspaceFeatures.chatEnabled} onCheckedChange={(v) => onUpdate('chatEnabled', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-lime-600" />
            고급 기능
          </CardTitle>
          <CardDescription className="text-slate-500">추가 기능 및 자동화를 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureToggle icon={CheckCircle} iconColor="text-emerald-600" label="결재 기능"
              checked={workspaceFeatures.approvalEnabled} onCheckedChange={(v) => onUpdate('approvalEnabled', v)} />
            <FeatureToggle icon={BarChart3} iconColor="text-violet-600" label="마케팅 기능"
              checked={workspaceFeatures.marketingEnabled} onCheckedChange={(v) => onUpdate('marketingEnabled', v)} />
            <FeatureToggle icon={Zap} iconColor="text-amber-600" label="자동화"
              checked={workspaceFeatures.automationEnabled} onCheckedChange={(v) => onUpdate('automationEnabled', v)} />
            <FeatureToggle icon={Database} iconColor="text-slate-600" label="활동 로그"
              checked={workspaceFeatures.logsEnabled} onCheckedChange={(v) => onUpdate('logsEnabled', v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
