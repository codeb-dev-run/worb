'use client'

import React from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function TaskBarChart({ data }: { data: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">미완료 작업 (프로젝트별)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function TaskDonutChart({ data }: { data: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">작업 상태 (완료 상태별)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="50%" dy="-1em" fontSize="24" fontWeight="bold">{data.reduce((acc, cur) => acc + cur.value, 0)}</tspan>
                                <tspan x="50%" dy="1.5em" fontSize="12" fill="#999">실제 합계</tspan>
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2 space-y-2">
                        {data.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function TaskLineChart({ data }: { data: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">시간 경과에 따른 작업 완료</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis hide />
                            <Tooltip />
                            <Line type="monotone" dataKey="completed" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function OverdueAreaChart({ data }: { data: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">마감된 작업 (예상별)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="value" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
