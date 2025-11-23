'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function ContractsPage() {
    const [contracts, setContracts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadContracts()
    }, [])

    const loadContracts = async () => {
        try {
            const response = await fetch('/api/contracts')
            const data = await response.json()
            setContracts(data)
        } catch (error) {
            console.error('Failed to load contracts:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        const colors = {
            DRAFT: 'bg-gray-100 text-gray-700',
            ACTIVE: 'bg-green-100 text-green-700',
            COMPLETED: 'bg-blue-100 text-blue-700',
            TERMINATED: 'bg-red-100 text-red-700',
        }
        return colors[status as keyof typeof colors] || 'bg-gray-100'
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">계약 관리</h1>
                    <p className="text-gray-500">프로젝트 계약을 관리합니다</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    새 계약 등록
                </Button>
            </div>

            <div className="grid gap-4">
                {contracts.map((contract) => (
                    <Card key={contract.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        {contract.title}
                                    </CardTitle>
                                    <p className="text-sm text-gray-500 mt-1">{contract.clientName}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                                    {contract.status}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-500">계약 금액</div>
                                    <div className="font-medium">{contract.amount.toLocaleString()}원</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">시작일</div>
                                    <div className="font-medium">{format(new Date(contract.startDate), 'yyyy-MM-dd')}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">종료일</div>
                                    <div className="font-medium">{format(new Date(contract.endDate), 'yyyy-MM-dd')}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
