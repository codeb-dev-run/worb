'use client'

import React, { useState, useEffect } from 'react'
import FileUpload from '@/components/files/FileUpload'
import FileList, { FileItem } from '@/components/files/FileList'
import { useAuth } from '@/lib/auth-context'
import toast from 'react-hot-toast'
import fileService from '@/services/file-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { File, HardDrive, Clock, Download } from 'lucide-react'

interface DownloadHistory {
  id: string
  fileId: string
  fileName: string
  downloadedBy: string
  downloadedAt: Date
  userAgent?: string
}

export default function FilesPage() {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'files' | 'history'>('files')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([])

  // Firebase에서 파일 목록 로드
  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const filesList = await fileService.getFiles()

      // FileMetadata를 FileItem으로 변환
      const fileItems: FileItem[] = filesList.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        category: file.category,
        uploadedBy: file.uploadedByName,
        createdAt: new Date(file.createdAt)
      }))

      setFiles(fileItems)
    } catch (error) {
      console.error('Failed to load files:', error)
      toast.error('파일 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (newFiles: File[]) => {
    if (!user || !userProfile) return

    try {
      // Firebase Storage에 업로드
      const uploadedFiles = await fileService.uploadFiles(
        newFiles,
        user.uid,
        userProfile.displayName || userProfile.email
      )

      // 업로드된 파일을 목록에 추가
      const fileItems: FileItem[] = uploadedFiles.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        category: file.category,
        uploadedBy: file.uploadedByName,
        createdAt: new Date(file.createdAt)
      }))

      setFiles(prev => [...fileItems, ...prev])
      toast.success('파일이 업로드되었습니다.')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('파일 업로드에 실패했습니다.')
    }
  }

  const getFileCategory = (type: string): FileItem['category'] => {
    if (type.startsWith('image/')) return 'image'
    if (type.startsWith('video/')) return 'video'
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document'
    return 'other'
  }

  const handleDownload = async (file: FileItem) => {
    if (!user || !userProfile) return

    try {
      // 다운로드 이력 기록
      await fileService.recordDownload(
        file.id,
        user.uid,
        userProfile.displayName || userProfile.email
      )

      // 다운로드 이력 추가 (UI 업데이트용)
      const newDownload: DownloadHistory = {
        id: `dl-${Date.now()}`,
        fileId: file.id,
        fileName: file.name,
        downloadedBy: userProfile?.displayName || '알 수 없음',
        downloadedAt: new Date(),
        userAgent: navigator.userAgent.split(' ').pop() || 'Unknown'
      }

      setDownloadHistory(prev => [newDownload, ...prev])

      toast.success(`${file.name} 다운로드를 시작합니다.`)

      // 파일 다운로드
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      link.target = '_blank'
      link.click()
    } catch (error) {
      console.error('Download error:', error)
      toast.error('파일 다운로드에 실패했습니다.')
    }
  }

  const handleDelete = async (file: FileItem) => {
    if (confirm(`${file.name} 파일을 삭제하시겠습니까?`)) {
      try {
        // Firebase Storage에서 파일 삭제
        await fileService.deleteFile(file.id)

        setFiles(prev => prev.filter(f => f.id !== file.id))
        toast.success('파일이 삭제되었습니다.')
      } catch (error) {
        console.error('Delete error:', error)
        toast.error('파일 삭제에 실패했습니다.')
      }
    }
  }

  const canDelete = userProfile?.role === 'admin'
  const canViewHistory = userProfile?.role === 'admin'

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">파일 관리</h1>
        <p className="text-muted-foreground mt-1">프로젝트 관련 파일을 업로드하고 관리합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 파일</p>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
              </div>
              <File className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 용량</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">최근 업로드</p>
                <p className="text-2xl font-bold">{stats.recentUploads}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">다운로드</p>
                <p className="text-2xl font-bold">{stats.totalDownloads}</p>
              </div>
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'files' | 'history')}>
        <TabsList>
          <TabsTrigger value="files">파일 목록</TabsTrigger>
          {canViewHistory && (
            <TabsTrigger value="history">다운로드 이력</TabsTrigger>
          )}
        </TabsList>

        {/* 파일 관리 탭 */}
        <TabsContent value="files" className="space-y-6">
          {/* 업로드 영역 */}
          {(userProfile?.role === 'admin' || userProfile?.role === 'member') && (
            <Card>
              <CardHeader>
                <CardTitle>파일 업로드</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>파일 목록</CardTitle>
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
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>다운로드 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {downloadHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground mb-4">
                      <Download className="w-16 h-16 mx-auto mb-4" />
                    </div>
                    <p className="text-muted-foreground">다운로드 이력이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>파일명</TableHead>
                        <TableHead>다운로드한 사용자</TableHead>
                        <TableHead>다운로드 시간</TableHead>
                        <TableHead>브라우저</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloadHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Download className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{history.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{history.downloadedBy}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(history.downloadedAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
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