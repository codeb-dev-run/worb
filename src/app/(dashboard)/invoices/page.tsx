'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getDatabase, ref, onValue, off } from 'firebase/database'
import { app } from '@/lib/firebase'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Download, Eye, Search, Filter, Calendar,
  DollarSign, Clock, CheckCircle, AlertCircle, CreditCard,
  Loader2, Building2, Receipt, TrendingUp
} from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  amount: number
  tax: number
  totalAmount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issueDate: string
  dueDate: string
  paidDate?: string
  paymentMethod?: string
  description: string
  items: InvoiceItem[]
  notes?: string
  createdAt: string
  updatedAt: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

const statusConfig = {
  draft: { label: '초안', variant: 'outline' as const, icon: FileText },
  sent: { label: '발송됨', variant: 'secondary' as const, icon: Clock },
  paid: { label: '결제완료', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-500' },
  overdue: { label: '연체', variant: 'destructive' as const, icon: AlertCircle },
  cancelled: { label: '취소됨', variant: 'outline' as const, icon: Receipt }
}

export default function InvoicesPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)



  // 청구서 데이터 로드
  useEffect(() => {
    if (!user || !userProfile) return

    const db = getDatabase(app)
    const invoicesRef = ref(db, 'invoices')

    const unsubscribe = onValue(invoicesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const invoicesList = Object.entries(data).map(([id, invoice]: [string, any]) => ({
          id,
          ...invoice,
          items: invoice.items || []
        }))

        // 고객은 자신의 청구서만 볼 수 있음
        const filteredInvoices = invoicesList.filter(inv =>
          inv.clientId === user.uid ||
          (userProfile.group && inv.clientGroup === userProfile.group)
        )

        setInvoices(filteredInvoices.sort((a, b) =>
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        ))
      } else {
        setInvoices([])
      }
      setLoading(false)
    })

    return () => off(invoicesRef)
  }, [user, userProfile])

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStats = () => {
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const pendingAmount = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
    const overdueCount = invoices.filter(inv => inv.status === 'overdue').length

    return { totalAmount, paidAmount, pendingAmount, overdueCount }
  }

  const stats = getStats()

  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleDownload = (invoice: Invoice) => {
    // 실제 다운로드 로직 구현
    toast.success('청구서 다운로드를 시작합니다.')
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">청구서를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">청구서</h1>
        <p className="text-muted-foreground mt-1">프로젝트 청구서 및 결제 내역을 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 청구액</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">결제 완료</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">미결제</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">연체</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueCount}건</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
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
            placeholder="청구서 검색..."
            className="pl-10"
          />
        </div>

        <Tabs value={filterStatus} onValueChange={setFilterStatus}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="draft">초안</TabsTrigger>
            <TabsTrigger value="sent">발송됨</TabsTrigger>
            <TabsTrigger value="paid">결제완료</TabsTrigger>
            <TabsTrigger value="overdue">연체</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 청구서 목록 */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">청구서가 없습니다</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? '다른 검색 조건을 시도해보세요.'
                : '아직 발행된 청구서가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const StatusIcon = statusConfig[invoice.status].icon
            const statusInfo = statusConfig[invoice.status]
            const daysUntilDue = getDaysUntilDue(invoice.dueDate)

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                          <Badge
                            variant={statusInfo.variant}
                            className={invoice.status === 'paid' ? 'bg-green-500' : undefined}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          {invoice.status === 'sent' && daysUntilDue < 0 && (
                            <Badge variant="destructive">
                              {Math.abs(daysUntilDue)}일 연체
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">프로젝트</p>
                            <p className="font-medium">{invoice.projectName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">청구 금액</p>
                            <p className="font-semibold text-lg">{formatCurrency(invoice.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">납부 기한</p>
                            <p className="font-medium">
                              {new Date(invoice.dueDate).toLocaleDateString('ko-KR')}
                              {invoice.status === 'sent' && daysUntilDue >= 0 && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  (D-{daysUntilDue})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">{invoice.description}</p>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(invoice)
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* 청구서 상세 모달 */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedInvoice.invoiceNumber}</CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge
                      variant={statusConfig[selectedInvoice.status].variant}
                      className={selectedInvoice.status === 'paid' ? 'bg-green-500' : undefined}
                    >
                      {statusConfig[selectedInvoice.status].label}
                    </Badge>
                    <span className="text-muted-foreground">
                      발행일: {new Date(selectedInvoice.issueDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 프로젝트 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      프로젝트 정보
                    </h4>
                    <p className="text-sm">{selectedInvoice.projectName}</p>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.clientName}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      결제 정보
                    </h4>
                    <p className="text-sm">납부 기한: {new Date(selectedInvoice.dueDate).toLocaleDateString('ko-KR')}</p>
                    {selectedInvoice.paidDate && (
                      <p className="text-sm text-green-600">
                        결제일: {new Date(selectedInvoice.paidDate).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* 청구 항목 */}
                <div>
                  <h4 className="font-medium mb-3">청구 항목</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">항목</th>
                          <th className="text-right p-3 text-sm font-medium">수량</th>
                          <th className="text-right p-3 text-sm font-medium">단가</th>
                          <th className="text-right p-3 text-sm font-medium">금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3 text-sm">{item.description}</td>
                            <td className="p-3 text-sm text-right">{item.quantity}</td>
                            <td className="p-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t bg-muted/50">
                        <tr>
                          <td colSpan={3} className="p-3 text-sm text-right">소계</td>
                          <td className="p-3 text-sm text-right font-medium">{formatCurrency(selectedInvoice.amount)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-3 text-sm text-right">부가세 (10%)</td>
                          <td className="p-3 text-sm text-right font-medium">{formatCurrency(selectedInvoice.tax)}</td>
                        </tr>
                        <tr className="border-t">
                          <td colSpan={3} className="p-3 text-right font-medium">총액</td>
                          <td className="p-3 text-lg text-right font-bold">{formatCurrency(selectedInvoice.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 메모 */}
                {selectedInvoice.notes && (
                  <div>
                    <h4 className="font-medium mb-2">메모</h4>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* 결제 방법 */}
                {selectedInvoice.status === 'sent' && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5" />
                        <h4 className="font-medium">결제 방법</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        계좌 이송: 우리은행 1005-123-456789 (주)코드비
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* 액션 버튼 */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedInvoice)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF 다운로드
                  </Button>
                  {selectedInvoice.status === 'sent' && (
                    <Button>
                      <CreditCard className="h-4 w-4 mr-2" />
                      결제하기
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}