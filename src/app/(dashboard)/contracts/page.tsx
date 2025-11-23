'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off, push, update, remove } from 'firebase/database'
import { app } from '@/lib/firebase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Download, Eye, Search, Filter, Calendar,
  Building2, Clock, CheckCircle, AlertCircle, XCircle,
  Plus, Edit2, Trash2, DollarSign, User, Shield,
  Loader2, FileSignature, AlertTriangle
} from 'lucide-react'

interface Contract {
  id: string
  contractNumber: string
  title: string
  type: 'service' | 'maintenance' | 'consulting' | 'license' | 'nda'
  status: 'draft' | 'sent' | 'negotiating' | 'signed' | 'active' | 'expired' | 'terminated'
  clientId: string
  clientName: string
  projectId?: string
  projectName?: string
  startDate: string
  endDate: string
  value: number
  currency: string
  paymentTerms: string
  signatories: {
    client: { name: string; title: string; signed: boolean; signedDate?: string }
    company: { name: string; title: string; signed: boolean; signedDate?: string }
  }
  terms?: string
  attachments?: string[]
  renewalDate?: string
  autoRenew: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

const contractTypeConfig = {
  service: { label: '서비스 계약', icon: FileText },
  maintenance: { label: '유지보수', icon: Clock },
  consulting: { label: '컨설팅', icon: Building2 },
  license: { label: '라이선스', icon: Shield },
  nda: { label: 'NDA', icon: FileSignature }
}

const statusConfig = {
  draft: { label: '초안', variant: 'outline' as const, icon: FileText },
  sent: { label: '발송됨', variant: 'secondary' as const, icon: Clock },
  negotiating: { label: '협상중', variant: 'secondary' as const, icon: AlertCircle },
  signed: { label: '서명완료', variant: 'default' as const, icon: CheckCircle },
  active: { label: '유효', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500' },
  expired: { label: '만료', variant: 'outline' as const, icon: XCircle },
  terminated: { label: '종료', variant: 'destructive' as const, icon: XCircle }
}

export default function ContractsPage() {
  const { user, userProfile } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  const [formData, setFormData] = useState<{
    contractNumber: string
    title: string
    type: 'service' | 'maintenance' | 'consulting' | 'license' | 'nda'
    clientName: string
    projectName: string
    startDate: string
    endDate: string
    value: string
    paymentTerms: string
    autoRenew: boolean
    terms: string
  }>({
    contractNumber: '',
    title: '',
    type: 'service',
    clientName: '',
    projectName: '',
    startDate: '',
    endDate: '',
    value: '',
    paymentTerms: '',
    autoRenew: false,
    terms: ''
  })

  useEffect(() => {
    if (!user || (userProfile?.role !== 'admin' && userProfile?.role !== 'member')) return

    const db = getDatabase(app)
    const contractsRef = ref(db, 'contracts')

    const unsubscribe = onValue(contractsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const contractsList = Object.entries(data).map(([id, contract]: [string, any]) => ({
          id,
          ...contract
        }))

        setContracts(contractsList.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
      } else {
        setContracts([])
      }
      setLoading(false)
    })

    return () => off(contractsRef)
  }, [user, userProfile])

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.projectName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus
    const matchesType = filterType === 'all' || contract.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const getContractStats = () => {
    const totalContracts = contracts.length
    const activeContracts = contracts.filter(c => c.status === 'active').length
    const totalValue = contracts
      .filter(c => c.status === 'active' || c.status === 'signed')
      .reduce((sum, c) => sum + c.value, 0)
    const expiringContracts = contracts.filter(c => {
      if (c.status !== 'active') return false
      const daysUntilExpiry = Math.ceil((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0
    }).length

    return { totalContracts, activeContracts, totalValue, expiringContracts }
  }

  const stats = getContractStats()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const db = getDatabase(app)
      const contractData = {
        contractNumber: formData.contractNumber || `CNT-${Date.now()}`,
        title: formData.title,
        type: formData.type,
        status: 'draft' as const,
        clientName: formData.clientName,
        clientId: 'temp-client-id', // 실제로는 클라이언트 ID를 찾아야 함
        projectName: formData.projectName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        value: parseFloat(formData.value),
        currency: 'KRW',
        paymentTerms: formData.paymentTerms,
        autoRenew: formData.autoRenew,
        terms: formData.terms,
        signatories: {
          client: { name: '', title: '', signed: false },
          company: { name: '', title: '', signed: false }
        },
        createdBy: user!.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (editingContract) {
        await update(ref(db, `contracts/${editingContract.id}`), {
          ...contractData,
          createdAt: editingContract.createdAt
        })
        toast.success('계약이 수정되었습니다.')
      } else {
        await push(ref(db, 'contracts'), contractData)
        toast.success('계약이 생성되었습니다.')
      }

      handleCloseModal()
    } catch (error) {
      console.error('Error saving contract:', error)
      toast.error('계약 저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (contractId: string) => {
    if (!confirm('정말 이 계약을 삭제하시겠습니까?')) return

    try {
      const db = getDatabase(app)
      await remove(ref(db, `contracts/${contractId}`))
      toast.success('계약이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting contract:', error)
      toast.error('계약 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    try {
      const db = getDatabase(app)
      await update(ref(db, `contracts/${contractId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      toast.success('계약 상태가 변경되었습니다.')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('상태 변경 중 오류가 발생했습니다.')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingContract(null)
    setFormData({
      contractNumber: '',
      title: '',
      type: 'service',
      clientName: '',
      projectName: '',
      startDate: '',
      endDate: '',
      value: '',
      paymentTerms: '',
      autoRenew: false,
      terms: ''
    })
  }

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setFormData({
      contractNumber: contract.contractNumber,
      title: contract.title,
      type: contract.type,
      clientName: contract.clientName,
      projectName: contract.projectName || '',
      startDate: contract.startDate,
      endDate: contract.endDate,
      value: contract.value.toString(),
      paymentTerms: contract.paymentTerms,
      autoRenew: contract.autoRenew,
      terms: contract.terms || ''
    })
    setShowModal(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getDaysUntilExpiry = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">계약 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">계약 관리</h1>
          <p className="text-muted-foreground mt-1">프로젝트 계약을 관리하고 추적합니다</p>
        </div>

        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 계약
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 계약</p>
                <p className="text-2xl font-bold">{stats.totalContracts}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">유효 계약</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeContracts}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">계약 총액</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">만료 예정</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiringContracts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="계약 검색..."
            className="pl-10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="draft">초안</SelectItem>
            <SelectItem value="sent">발송됨</SelectItem>
            <SelectItem value="negotiating">협상중</SelectItem>
            <SelectItem value="signed">서명완료</SelectItem>
            <SelectItem value="active">유효</SelectItem>
            <SelectItem value="expired">만료</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="유형 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 유형</SelectItem>
            <SelectItem value="service">서비스 계약</SelectItem>
            <SelectItem value="maintenance">유지보수</SelectItem>
            <SelectItem value="consulting">컨설팅</SelectItem>
            <SelectItem value="license">라이선스</SelectItem>
            <SelectItem value="nda">NDA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 계약 목록 */}
      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">계약이 없습니다</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? '다른 검색 조건을 시도해보세요.'
                : '첫 계약을 생성해보세요.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContracts.map((contract) => {
            const TypeIcon = contractTypeConfig[contract.type].icon
            const statusInfo = statusConfig[contract.status]
            const daysUntilExpiry = contract.status === 'active' ? getDaysUntilExpiry(contract.endDate) : null

            return (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  className="h-full hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedContract(contract)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{contract.contractNumber}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{contract.title}</p>
                      </div>
                      <Badge
                        variant={statusInfo.variant}
                        className={contract.status === 'active' ? 'bg-green-500' : undefined}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{contractTypeConfig[contract.type].label}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{contract.clientName}</span>
                      </div>

                      {contract.projectName && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{contract.projectName}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatCurrency(contract.value)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(contract.startDate).toLocaleDateString('ko-KR')} -
                          {new Date(contract.endDate).toLocaleDateString('ko-KR')}
                        </span>
                      </div>

                      {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-600 font-medium">
                            {daysUntilExpiry}일 후 만료
                          </span>
                        </div>
                      )}

                      {contract.autoRenew && (
                        <Badge variant="outline" className="text-xs">
                          자동갱신
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(contract)
                        }}
                        className="flex-1"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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

      {/* 계약 생성/수정 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? '계약 수정' : '새 계약 생성'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractNumber">계약 번호</Label>
                  <Input
                    id="contractNumber"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    placeholder="자동 생성"
                  />
                </div>

                <div>
                  <Label htmlFor="type">계약 유형</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">서비스 계약</SelectItem>
                      <SelectItem value="maintenance">유지보수</SelectItem>
                      <SelectItem value="consulting">컨설팅</SelectItem>
                      <SelectItem value="license">라이선스</SelectItem>
                      <SelectItem value="nda">NDA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">계약 제목 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">고객사 *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="projectName">프로젝트</Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">시작일 *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">종료일 *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">계약 금액 *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="paymentTerms">결제 조건</Label>
                  <Input
                    id="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    placeholder="예: Net 30"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="terms">계약 조건</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={4}
                  placeholder="주요 계약 조건을 입력하세요"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRenew"
                  checked={formData.autoRenew}
                  onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="autoRenew" className="text-sm font-normal cursor-pointer">
                  자동 갱신
                </Label>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                취소
              </Button>
              <Button type="submit">
                {editingContract ? '수정' : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 계약 상세 모달 */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedContract(null)}>
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedContract.contractNumber}</CardTitle>
                  <p className="text-muted-foreground mt-1">{selectedContract.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={statusConfig[selectedContract.status].variant}
                    className={selectedContract.status === 'active' ? 'bg-green-500' : undefined}
                  >
                    {statusConfig[selectedContract.status].label}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedContract(null)}>
                    ✕
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">계약 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">유형</span>
                        <span>{contractTypeConfig[selectedContract.type].label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">고객사</span>
                        <span>{selectedContract.clientName}</span>
                      </div>
                      {selectedContract.projectName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">프로젝트</span>
                          <span>{selectedContract.projectName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">계약 금액</span>
                        <span className="font-medium">{formatCurrency(selectedContract.value)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">계약 기간</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">시작일</span>
                        <span>{new Date(selectedContract.startDate).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">종료일</span>
                        <span>{new Date(selectedContract.endDate).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">결제 조건</span>
                        <span>{selectedContract.paymentTerms}</span>
                      </div>
                      {selectedContract.autoRenew && (
                        <Badge variant="outline" className="mt-2">자동 갱신</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedContract.terms && (
                  <div>
                    <h4 className="font-medium mb-3">계약 조건</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedContract.terms}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-3">서명 현황</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">고객사</span>
                          {selectedContract.signatories.client.signed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm">{selectedContract.signatories.client.name || '미지정'}</p>
                        <p className="text-xs text-muted-foreground">{selectedContract.signatories.client.title || '직책'}</p>
                        {selectedContract.signatories.client.signedDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            서명일: {new Date(selectedContract.signatories.client.signedDate).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">당사</span>
                          {selectedContract.signatories.company.signed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm">{selectedContract.signatories.company.name || '미지정'}</p>
                        <p className="text-xs text-muted-foreground">{selectedContract.signatories.company.title || '직책'}</p>
                        {selectedContract.signatories.company.signedDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            서명일: {new Date(selectedContract.signatories.company.signedDate).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    생성일: {new Date(selectedContract.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                  <div className="flex gap-2">
                    {userProfile?.role === 'admin' && (
                      <Select
                        value={selectedContract.status}
                        onValueChange={(value) => {
                          handleStatusChange(selectedContract.id, value)
                          setSelectedContract({ ...selectedContract, status: value as any })
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">초안</SelectItem>
                          <SelectItem value="sent">발송됨</SelectItem>
                          <SelectItem value="negotiating">협상중</SelectItem>
                          <SelectItem value="signed">서명완료</SelectItem>
                          <SelectItem value="active">유효</SelectItem>
                          <SelectItem value="expired">만료</SelectItem>
                          <SelectItem value="terminated">종료</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      다운로드
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}