'use client'

import React, { useState, useCallback, useEffect } from 'react'
import ReactFlow, {
    Node,
    Edge,
    addEdge,
    Connection,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, Save, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface MindmapEditorProps {
    projectId: string
}

export default function MindmapEditor({ projectId }: MindmapEditorProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Load existing tasks as mindmap nodes
    useEffect(() => {
        loadTasks()
    }, [projectId])

    const loadTasks = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/projects/${projectId}/tasks`)
            const data = await response.json()
            setTasks(data)

            // Convert tasks to mindmap nodes
            const taskNodes: Node[] = data.map((task: any, index: number) => ({
                id: task.id,
                type: 'default',
                data: {
                    label: (
                        <div className="px-3 py-2">
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-gray-500">{task.status}</div>
                        </div>
                    )
                },
                position: {
                    x: (index % 4) * 250,
                    y: Math.floor(index / 4) * 120
                },
            }))

            setNodes(taskNodes)
        } catch (error) {
            console.error('Failed to load tasks:', error)
            toast.error('작업 로드 실패')
        } finally {
            setLoading(false)
        }
    }

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    )

    const addNode = async () => {
        const newTaskTitle = `새 작업 ${nodes.length + 1}`

        try {
            // Create actual task in DB
            const response = await fetch(`/api/projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTaskTitle,
                    status: 'todo',
                    priority: 'medium',
                    description: '마인드맵에서 생성됨',
                }),
            })

            if (!response.ok) throw new Error('Failed to create task')

            const newTask = await response.json()
            toast.success('작업이 생성되었습니다')

            // Reload to sync with Kanban/Gantt
            await loadTasks()
        } catch (error) {
            console.error('Failed to add node:', error)
            toast.error('작업 생성에 실패했습니다')
        }
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex gap-2 p-4 border-b bg-white">
                <Button onClick={addNode} size="sm" disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    작업 추가
                </Button>
                <Button onClick={loadTasks} size="sm" variant="outline" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                </Button>
                <div className="ml-auto text-sm text-gray-500 flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        실시간 동기화
                    </span>
                    총 {nodes.length}개 작업
                </div>
            </div>

            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                >
                    <Controls />
                    <Background />
                </ReactFlow>
            </div>

            <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
                💡 마인드맵에서 추가한 작업은 칸반 보드와 간트 차트에 자동으로 반영됩니다
            </div>
        </div>
    )
}
