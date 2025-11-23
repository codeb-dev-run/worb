'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { motion } from 'framer-motion'
import { Task as TaskType } from '@/services/task-service'
import { TaskStatus, TaskPriority } from '@/types/task'
import { getAllTasks, updateTask, deleteTask } from '@/actions/task'
import { getProjects } from '@/actions/project'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function TasksPage() {
  const { userProfile } = useAuth()
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')

  const loadData = async () => {
    if (!userProfile) return

    try {
      const [tasksData, projectsData] = await Promise.all([
        getAllTasks(userProfile.uid),
        getProjects(userProfile.uid)
      ])

      setTasks(tasksData as unknown as TaskType[])
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading tasks data:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userProfile])

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const result = await updateTask(taskId, { status: newStatus })
      if (result.success) {
        toast.success('상태가 업데이트되었습니다.')
        loadData()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('상태 업데이트 실패')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return

    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        toast.success('작업이 삭제되었습니다.')
        loadData()
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('삭제 실패')
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterProject !== 'all' && task.projectId !== filterProject) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">내 작업</h1>
        <div className="flex gap-3">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">모든 프로젝트</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">모든 상태</option>
            <option value="todo">할 일</option>
            <option value="in_progress">진행 중</option>
            <option value="review">검토</option>
            <option value="done">완료</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프로젝트</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">우선순위</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마감일</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/projects/${task.projectId}`} className="text-sm text-blue-600 hover:underline">
                      {(task as any).projectName || 'Unknown Project'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${task.status === 'done' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'review' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                        }`}
                    >
                      <option value="todo">할 일</option>
                      <option value="in_progress">진행 중</option>
                      <option value="review">검토</option>
                      <option value="done">완료</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                      }`}>
                      {task.priority === 'urgent' ? '긴급' :
                        task.priority === 'high' ? '높음' :
                          task.priority === 'medium' ? '보통' : '낮음'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  작업이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}