'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function PLPage() {
    const [summary, setSummary] = useState({ income: 0, expense: 0, profit: 0 })
    const [transactions, setTransactions] = useState<any[]>([])

    useEffect(() => {
        loadPLData()
    }, [])

    const loadPLData = async () => {
        try {
            const response = await fetch('/api/transactions/summary')
            const data = await response.json()
            setSummary(data.summary)
            setTransactions(data.transactions)
        } catch (error) {
            console.error('Failed to load P&L data:', error)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">손익 관리</h1>
                <p className="text-gray-500">수입과 지출을 관리합니다</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">총 수입</CardTitle>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {summary.income.toLocaleString()}원
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">총 지출</CardTitle>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {summary.expense.toLocaleString()}원
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">순이익</CardTitle>
                        <DollarSign className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {summary.profit.toLocaleString()}원
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>최근 거래 내역</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {transactions.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium">{tx.description}</div>
                                    <div className="text-sm text-gray-500">{tx.category}</div>
                                </div>
                                <div className={`font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString()}원
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
