'use client'

const isDev = process.env.NODE_ENV === 'development'

import { useState, useEffect, useCallback } from 'react'
import FileUpload from '@/components/files/FileUpload'
import FileList, { FileItem } from '@/components/files/FileList'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { File, HardDrive, Clock, Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// ===========================================
// Glass Morphism Files Page - Storage Server Integration
// ===========================================

interface DownloadHistory {
  id: string
  fileId: string
  fileName: string
  downloadedBy: string
  downloadedAt: Date
  userAgent?: string
}

interface ApiFile {
  id: string
  name: string
  originalName: string
  mimeType: string
  size: number
  category: string
  url: string
  description: string | null
  tags: string[]
  isPublic: boolean
  uploadedBy: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  project: {
    id: string
    name: string
  } | null
  downloadCount: number
  createdAt: string
}

export default function FilesPage() {
  const { userProfile } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [activeTab, setActiveTab] = useState<'files' | 'history'>('files')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [downloadHistory] = useState<DownloadHistory[]>([])

  // API에서 파일 목록 로드
  const loadFiles = useCallback(async () => {
    if (!currentWorkspace?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/files?workspaceId=${currentWorkspace.id}&limit=100`)

      if (!response.ok) {
        throw new Error('Failed to load files')
      }

      const data = await response.json()

      // API 응답을 FileItem 형식으로 변환
      const fileItems: FileItem[] = data.files.map((file: ApiFile) => ({
        id: file.id,
        name: file.originalName,
        size: file.size,
        type: file.mimeType,
        url: file.url,
        category: file.category.toLowerCase() as 'document' | 'image' | 'video' | 'other',
        uploadedBy: file.uploadedBy.name || file.uploadedBy.email,
        createdAt: new Date(file.createdAt),
      }))

      setFiles(fileItems)
    } catch (error) {
      if (isDev) console.error('Failed to load files:', error)
      toast.error('파일 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleUpload = async (newFiles: File[]) => {
    if (!currentWorkspace?.id) {
      toast.error('워크스페이스를 선택해주세요.')
      return
    }

    setUploading(true)
    const uploadPromises = newFiles.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspaceId', currentWorkspace.id)

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `${file.name} 업로드 실패`)
      }

      return response.json()
    })

    try {
      const results = await Promise.allSettled(uploadPromises)

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      if (successCount > 0) {
        toast.success(`${successCount}개 파일이 업로드되었습니다.`)
        await loadFiles() // 파일 목록 새로고침
      }

      if (failCount > 0) {
        toast.error(`${failCount}개 파일 업로드에 실패했습니다.`)
      }
    } catch (error) {
      if (isDev) console.error('Upload error:', error)
      toast.error('파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file: FileItem) => {
    try {
      // 새 탭에서 다운로드 링크 열기
      window.open(`/api/files/${file.id}/download`, '_blank')

      // 다운로드 이력 새로고침 (다운로드 후 약간의 딜레이)
      setTimeout(() => {
        // loadDownloadHistory() // 필요시 구현
      }, 1000)
    } catch (error) {
      if (isDev) console.error('Download error:', error)
      toast.error('파일 다운로드에 실패했습니다.')
    }
  }

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`"${file.name}" 파일을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      toast.success('파일이 삭제되었습니다.')
      await loadFiles() // 파일 목록 새로고침
    } catch (error) {
      if (isDev) console.error('Delete error:', error)
      toast.error('파일 삭제에 실패했습니다.')
    }
  }

  const canDelete = userProfile?.role === 'admin'
  const canViewHistory = userProfile?.role === 'admin'

  const formatDate = (date: Date) => {
    return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    )
  }

  // 통계 계산
  const stats = {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    recentUploads: files.filter(file => {
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 7)
      return file.createdAt > dayAgo
    }).length,
    totalDownloads: downloadHistory.length
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
    return (bytes / 1073741824).toFixed(2) + ' GB'
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 - Glass Style */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">파일 관리</h1>
        <p className="text-slate-500 mt-1">프로젝트 관련 파일을 업로드하고 관리합니다.</p>
      </div>

      {/* 통계 카드 - Glass Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass" className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">전체 파일</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalFiles}</p>
              </div>
              <div className="p-3 bg-lime-100 rounded-xl">
                <File className="h-6 w-6 text-lime-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">전체 용량</p>
                <p className="text-2xl font-bold text-slate-900">{formatFileSize(stats.totalSize)}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <HardDrive className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">최근 업로드</p>
                <p className="text-2xl font-bold text-slate-900">{stats.recentUploads}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">다운로드</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalDownloads}</p>
              </div>
              <div className="p-3 bg-violet-100 rounded-xl">
                <Download className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 - Glass Style */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'files' | 'history')}>
        <TabsList className="bg-white/60 backdrop-blur-sm p-1 rounded-xl border border-white/40">
          <TabsTrigger value="files" className="data-[state=active]:bg-black data-[state=active]:text-lime-400 rounded-lg">파일 목록</TabsTrigger>
          {canViewHistory && (
            <TabsTrigger value="history" className="data-[state=active]:bg-black data-[state=active]:text-lime-400 rounded-lg">다운로드 이력</TabsTrigger>
          )}
        </TabsList>

        {/* 파일 관리 탭 */}
        <TabsContent value="files" className="space-y-6 mt-6">
          {/* 업로드 영역 */}
          {(userProfile?.role === 'admin' || userProfile?.role === 'member') && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  파일 업로드
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-lime-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onUpload={handleUpload}
                  maxSize={100}
                  acceptedTypes={['*']}
                />
              </CardContent>
            </Card>
          )}

          {/* 파일 목록 */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-slate-900">파일 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <FileList
                files={files}
                onDownload={handleDownload}
                onDelete={handleDelete}
                canDelete={canDelete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 다운로드 이력 탭 */}
        {canViewHistory && (
          <TabsContent value="history" className="mt-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-slate-900">다운로드 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {downloadHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Download className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500">다운로드 이력이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/40">
                        <TableHead className="text-slate-700">파일명</TableHead>
                        <TableHead className="text-slate-700">다운로드한 사용자</TableHead>
                        <TableHead className="text-slate-700">다운로드 시간</TableHead>
                        <TableHead className="text-slate-700">브라우저</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloadHistory.map((history) => (
                        <TableRow key={history.id} className="border-white/40 hover:bg-white/60">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Download className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-slate-900">{history.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">{history.downloadedBy}</TableCell>
                          <TableCell className="text-slate-500">
                            {formatDate(history.downloadedAt)}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {history.userAgent}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
