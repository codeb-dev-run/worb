'use client'

import React from 'react'
import { Gantt } from 'wx-react-gantt'
import 'wx-react-gantt/dist/gantt.css'
import { Task } from '@/types/task'

interface SvarGanttChartProps {
    tasks: Task[]
}

export default function SvarGanttChart({ tasks }: SvarGanttChartProps) {
    // Transform tasks to SVAR Gantt format
    const data = tasks.map(task => {
        let startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt)
        // Ensure valid date
        if (isNaN(startDate.getTime())) {
            startDate = new Date()
        }

        let endDate = task.dueDate ? new Date(task.dueDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
        // Ensure valid date
        if (isNaN(endDate.getTime())) {
            endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
        }

        // Calculate duration in days
        let duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        if (duration < 1) duration = 1

        return {
            id: task.id,
            text: task.title,
            start_date: startDate,
            duration: duration,
            progress: (task as any).progress ? (task as any).progress / 100 : 0,
            type: "task" // Add type property
        }
    })

    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">표시할 작업이 없습니다.</p>
            </div>
        )
    }

    return (
        <div className="h-full w-full bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-full">
                <Gantt
                    tasks={data}
                    scales={[
                        { unit: "day", step: 1, format: "d" }
                    ]}
                    columns={[
                        { name: "text", label: "Task", width: 200 }, // Removed tree: true
                        { name: "start_date", label: "Start", align: "center", width: 100 },
                        { name: "duration", label: "Duration", align: "center", width: 70 },
                    ]}
                />
            </div>
        </div>
    )
}
