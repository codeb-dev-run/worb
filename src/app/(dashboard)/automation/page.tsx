'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import WorkflowBuilder from '@/components/automation/WorkflowBuilder'
import ServiceStatus from '@/components/automation/ServiceStatus'
import { Workflow, WorkflowTemplate } from '@/types/automation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings, Plus, ChevronLeft, Clock, Play, Pause,
  Trash2, Edit, Zap, CheckCircle, Activity, Timer,
  Bot, Sparkles, Calendar, Bell, Mail, MessageSquare,
  Webhook, Database, FileText, Users, HardDrive, Download, File
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// Mock 워크플로우 템플릿
const workflowTemplates: WorkflowTemplate[] = [
  {
    id: '1',
    name: '프로젝트 완료 알림',
    description: '프로젝트가 완료되면 관련자에게 자동으로 알림을 보냅니다',
    category: '프로젝트 관리',
    icon: FileText,
    trigger: { type: 'event' },
    actions: [{ type: 'notification' }, { type: 'email' }]
  },
  {
    id: '2',
    name: '일일 리포트 생성',
    description: '매일 오전 9시에 프로젝트 진행 상황 리포트를 생성합니다',
    category: '리포팅',
    icon: Database,
    trigger: { type: 'schedule' },
    actions: [{ type: 'api' }]
  },
  {
    id: '3',
    name: '작업 지연 알림',
    description: '작업이 마감일을 지나면 담당자에게 알림을 보냅니다',
    category: '작업 관리',
    icon: Clock,
    trigger: { type: 'event' },
    actions: [{ type: 'notification' }, { type: 'task' }]
  },
  {
    id: '4',
    name: '신규 고객 온보딩',
    description: '새로운 고객이 등록되면 환영 이메일과 작업을 생성합니다',
    category: '고객 관리',
    icon: Users,
    trigger: { type: 'event' },
    actions: [{ type: 'email' }, { type: 'task' }]
  }
]

// Mock 워크플로우 데이터
const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: '주간 리포트 자동 생성',
    description: '매주 월요일 오전 9시에 주간 리포트를 생성하고 팀에게 전송',
    status: 'active',
    trigger: {
      id: '1',
      type: 'schedule',
      name: '일정 기반',
      config: { schedule: '0 9 * * 1' }
    },
    actions: [
      {
        id: '1',
        type: 'api',
        name: 'API 호출',
        config: { url: '/api/reports/weekly' }
      },
      {
        id: '2',
        type: 'email',
        name: '이메일 전송',
        config: { to: 'team@company.com', subject: '주간 리포트' }
      }
    ],
    createdBy: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    lastRun: new Date('2024-01-22'),
    runCount: 4
  }
]

export default function AutomationPage() {
  const { userProfile } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>()
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | undefined>()

  // 권한 체크
  // 권한 체크
  if (userProfile?.role !== 'admin' && userProfile?.role !== 'member') {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">접근 권한 없음</h2>
              <p className="text-muted-foreground">자동화 기능은 관리자와 직원만 사용할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredWorkflows = workflows.filter(workflow =>
    filterStatus === 'all' || workflow.status === filterStatus
  )

  const handleSaveWorkflow = (workflowData: Partial<Workflow>) => {
    if (editingWorkflow) {
      // 수정
      setWorkflows(workflows.map(w =>
        w.id === editingWorkflow.id
          ? { ...editingWorkflow, ...workflowData, updatedAt: new Date() }
          : w
      ))
    } else {
      // 생성
      const newWorkflow: Workflow = {
        id: Date.now().toString(),
        ...workflowData as any,
        createdBy: userProfile?.displayName || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      }
      setWorkflows([...workflows, newWorkflow])
    }
    setShowBuilder(false)
    setEditingWorkflow(undefined)
  }

  const toggleWorkflowStatus = (workflowId: string) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId
        ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' }
        : w
    ))
  }

  const deleteWorkflow = (workflowId: string) => {
    if (confirm('정말로 이 워크플로우를 삭제하시겠습니까?')) {
      setWorkflows(workflows.filter(w => w.id !== workflowId))
    }
  }

  if (showBuilder) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowBuilder(false)
              setEditingWorkflow(undefined)
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {editingWorkflow ? '워크플로우 수정' : '워크플로우 생성'}
          </h1>
        </div>

        <WorkflowBuilder
          workflow={editingWorkflow}
          onSave={handleSaveWorkflow}
          onCancel={() => {
            setShowBuilder(false)
            setEditingWorkflow(undefined)
            setSelectedTemplate(undefined)
          }}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">자동화 워크플로우</h1>
          <p className="text-muted-foreground mt-1">반복적인 작업을 자동화하여 업무 효율성을 높이세요</p>
          <div className="mt-2">
            <ServiceStatus />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/automation/runs">
              <Clock className="mr-2 h-4 w-4" />
              실행 이력
            </Link>
          </Button>
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="mr-2 h-4 w-4" />
            워크플로우 생성
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 워크플로우</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">활성화</p>
                <p className="text-2xl font-bold">
                  {workflows.filter(w => w.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">이번 주 실행</p>
                <p className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.runCount, 0)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">절약된 시간</p>
                <p className="text-2xl font-bold">42시간</p>
              </div>
              <Timer className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 템플릿 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 시작 템플릿</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflowTemplates.map((template) => {
              const Icon = template.icon
              return (
                <motion.button
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedTemplate(template)
                    setShowBuilder(true)
                  }}
                  className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <Badge variant="secondary" className="text-xs">
                    {template.category}
                  </Badge>
                </motion.button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">상태:</span>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="active">활성</TabsTrigger>
                <TabsTrigger value="inactive">비활성</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* 워크플로우 목록 */}
      <div className="space-y-4">
        {filteredWorkflows.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                워크플로우가 없습니다
              </h3>
              <p className="text-muted-foreground mb-4">
                첫 번째 워크플로우를 만들어 업무를 자동화해보세요.
              </p>
              <Button onClick={() => setShowBuilder(true)}>
                워크플로우 생성하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredWorkflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {workflow.name}
                          </h3>
                          <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                            {workflow.status === 'active' ? '활성' : '비활성'}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-4">{workflow.description}</p>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            <span>트리거: {workflow.trigger.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            <span>액션: {workflow.actions.length}개</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            <span>실행: {workflow.runCount}회</span>
                          </div>
                          {workflow.lastRun && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>마지막 실행: {new Date(workflow.lastRun).toLocaleDateString('ko-KR')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="icon"
                          variant={workflow.status === 'active' ? 'default' : 'outline'}
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                          title={workflow.status === 'active' ? '비활성화' : '활성화'}
                        >
                          {workflow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setEditingWorkflow(workflow)
                            setShowBuilder(true)
                          }}
                          title="수정"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => deleteWorkflow(workflow.id)}
                          className="hover:bg-destructive hover:text-destructive-foreground"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}