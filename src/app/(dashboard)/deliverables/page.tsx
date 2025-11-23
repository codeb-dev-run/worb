'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { app } from '@/lib/firebase'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  FileText, Download, Eye, Search, Filter, Calendar,
  Package, FileIcon, Image as ImageIcon, Video, FileCode, Archive,
  Loader2, FolderOpen, Clock, CheckCircle
} from 'lucide-react'

interface Deliverable {
  id: string
  name: string
  description: string
  type: 'document' | 'design' | 'code' | 'video' | 'other'
  category: string
  fileUrl: string
  fileSize: number
  projectId: string
  projectName: string
  phase: string
  uploadedAt: string
  uploadedBy: string
  version?: string
  status: 'draft' | 'review' | 'approved' | 'final'
}

const typeIcons = {
  document: FileText,
  design: ImageIcon,
  code: FileCode,
  video: Video,
  other: FileIcon
}

const statusConfig = {
  draft: { label: '초안', variant: 'outline' as const },
  review: { label: '검토중', variant: 'secondary' as const },
  approved: { label: '승인됨', variant: 'default' as const },
  final: { label: '최종', variant: 'default' as const, className: 'bg-green-500' }
}

export default function DeliverablesPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // 고객이 아닌 경우 리다이렉트


  // 프로젝트 및 산출물 데이터 로드
  useEffect(() => {
    if (!user || !userProfile) return

    const db = getDatabase(app)

    // 프로젝트 데이터 로드
    const projectsRef = ref(db, 'projects')
    const projectsUnsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const projectsList = Object.entries(data).map(([id, project]: [string, any]) => ({
          id,
          ...project
        }))

        // 고객은 자신의 프로젝트만 볼 수 있음
        const filteredProjects = projectsList.filter(p =>
          p.clientId === user.uid ||
          (userProfile.group && p.clientGroup === userProfile.group)
        )

        setProjects(filteredProjects)
      }
    })

    // 산출물 데이터 로드 (실제로는 files 컬렉션에서 가져와야 함)
    const filesRef = ref(db, 'files')
    const filesUnsubscribe = onValue(filesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const filesList = Object.entries(data).map(([id, file]: [string, any]) => ({
          id,
          ...file,
          type: file.category || 'other',
          status: file.status || 'final'
        }))

        // 고객의 프로젝트에 속한 파일만 필터링
        const clientProjectIds = projects.map(p => p.id)
        const filteredFiles = filesList.filter(f =>
          clientProjectIds.includes(f.projectId)
        )

        setDeliverables(filteredFiles)
      } else {
        setDeliverables([])
      }
      setLoading(false)
    })

    return () => {
      projectsUnsubscribe()
      filesUnsubscribe()
    }
  }, [user, userProfile, projects])

  const filteredDeliverables = deliverables.filter(item => {
    const matchesProject = selectedProject === 'all' || item.projectId === selectedProject
    const matchesType = selectedType === 'all' || item.type === selectedType
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.projectName?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesProject && matchesType && matchesSearch
  })

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownload = (deliverable: Deliverable) => {
    // 실제 다운로드 로직
    window.open(deliverable.fileUrl, '_blank')
  }

  const handlePreview = (deliverable: Deliverable) => {
    // 파일 미리보기 로직
    window.open(deliverable.fileUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">산출물을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">프로젝트 산출물</h1>
        <p className="text-muted-foreground mt-1">프로젝트 관련 문서와 파일을 확인하고 다운로드하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 산출물</p>
                <p className="text-2xl font-bold">{deliverables.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">문서</p>
                <p className="text-2xl font-bold">
                  {deliverables.filter(d => d.type === 'document').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">디자인</p>
                <p className="text-2xl font-bold">
                  {deliverables.filter(d => d.type === 'design').length}
                </p>
              </div>
              <ImageIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">승인됨</p>
                <p className="text-2xl font-bold text-green-600">
                  {deliverables.filter(d => d.status === 'approved' || d.status === 'final').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="산출물 검색..."
            className="pl-10"
          />
        </div>

        {projects.length > 1 && (
          <Tabs value={selectedProject} onValueChange={setSelectedProject}>
            <TabsList>
              <TabsTrigger value="all">모든 프로젝트</TabsTrigger>
              {projects.map(project => (
                <TabsTrigger key={project.id} value={project.id}>
                  {project.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList>
            <TabsTrigger value="all">모든 유형</TabsTrigger>
            <TabsTrigger value="document">문서</TabsTrigger>
            <TabsTrigger value="design">디자인</TabsTrigger>
            <TabsTrigger value="code">코드</TabsTrigger>
            <TabsTrigger value="video">영상</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 산출물 목록 */}
      {filteredDeliverables.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">산출물이 없습니다</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedProject !== 'all' || selectedType !== 'all'
                ? '다른 검색 조건을 시도해보세요.'
                : '아직 업로드된 산출물이 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeliverables.map((deliverable) => {
            const Icon = typeIcons[deliverable.type] || FileIcon
            const statusInfo = statusConfig[deliverable.status]

            return (
              <motion.div
                key={deliverable.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <Badge
                        variant={statusInfo.variant}
                        className={deliverable.status === 'final' ? 'bg-green-500' : undefined}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <h3 className="font-semibold mb-1">{deliverable.name}</h3>
                    {deliverable.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {deliverable.description}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <span>{deliverable.projectName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{formatFileSize(deliverable.fileSize)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(deliverable.uploadedAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(deliverable)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        미리보기
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(deliverable)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}