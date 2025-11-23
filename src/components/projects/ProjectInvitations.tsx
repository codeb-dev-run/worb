'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import invitationService from '@/services/invitation-service'
import { ProjectInvitation } from '@/types'

interface ProjectInvitationsProps {
  projectId: string
  projectName: string
}

export default function ProjectInvitations({ projectId, projectName }: ProjectInvitationsProps) {
  const { userProfile } = useAuth()
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    expiresInDays: 7,
    permissions: {
      viewProject: true,
      viewTasks: true,
      viewFiles: true,
      viewChat: false
    }
  })
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    loadInvitations()
  }, [projectId])

  const loadInvitations = async () => {
    try {
      const invites = await invitationService.getProjectInvitations(projectId)
      setInvitations(invites)
    } catch (error) {
      console.error('Failed to load invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const createInvitation = async () => {
    if (!userProfile) return

    try {
      const invitation = await invitationService.createInvitation(
        projectId,
        userProfile.uid,
        newInvitation.email || undefined,
        newInvitation.expiresInDays
      )

      setInvitations([invitation, ...invitations])
      setShowCreateModal(false)
      setNewInvitation({
        email: '',
        expiresInDays: 7,
        permissions: {
          viewProject: true,
          viewTasks: true,
          viewFiles: true,
          viewChat: false
        }
      })
    } catch (error) {
      console.error('Failed to create invitation:', error)
      alert('초대 생성에 실패했습니다.')
    }
  }

  const copyInviteLink = (inviteCode: string) => {
    const url = invitationService.getInvitationUrl(inviteCode)
    navigator.clipboard.writeText(url)
    setCopiedCode(inviteCode)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const revokeInvitation = async (invitationId: string) => {
    if (confirm('정말 이 초대를 취소하시겠습니까?')) {
      try {
        await invitationService.revokeInvitation(invitationId)
        setInvitations(invitations.map(inv =>
          inv.id === invitationId ? { ...inv, status: 'revoked' } : inv
        ))
      } catch (error) {
        console.error('Failed to revoke invitation:', error)
        alert('초대 취소에 실패했습니다.')
      }
    }
  }

  const getStatusBadge = (status: ProjectInvitation['status']) => {
    const badges: Record<ProjectInvitation['status'], string> = {
      pending: 'bg-green-100 text-green-700',
      accepted: 'bg-blue-100 text-blue-700',
      expired: 'bg-gray-100 text-gray-700',
      revoked: 'bg-red-100 text-red-700'
    }
    const labels: Record<ProjectInvitation['status'], string> = {
      pending: '활성',
      accepted: '사용됨',
      expired: '만료됨',
      revoked: '취소됨'
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const canManageInvitations = userProfile?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">초대 관리</h3>
          <p className="text-sm text-gray-600 mt-1">
            외부 사용자를 초대하여 프로젝트 진행 상황을 공유할 수 있습니다.
          </p>
        </div>
        {canManageInvitations && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            새 초대 생성
          </button>
        )}
      </div>

      {/* 초대 목록 */}
      {invitations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <span className="text-4xl mb-4 block">✉️</span>
          <p className="text-gray-600">아직 생성된 초대가 없습니다.</p>
          {canManageInvitations && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-primary hover:underline"
            >
              첫 초대 생성하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(invitation.status)}
                    {invitation.email && (
                      <span className="text-sm text-gray-600">{invitation.email}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>만료일: {new Date(invitation.expiresAt).toLocaleDateString('ko-KR')}</span>
                    <span>생성일: {new Date(invitation.createdAt).toLocaleDateString('ko-KR')}</span>
                    {invitation.usedAt && (
                      <span>사용일: {new Date(invitation.usedAt).toLocaleDateString('ko-KR')}</span>
                    )}
                  </div>

                  {invitation.status === 'pending' && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={invitationService.getInvitationUrl(invitation.inviteCode)}
                        className="flex-1 px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded"
                      />
                      <button
                        onClick={() => copyInviteLink(invitation.inviteCode)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {copiedCode === invitation.inviteCode ? '복사됨!' : '복사'}
                      </button>
                    </div>
                  )}
                </div>

                {canManageInvitations && invitation.status === 'pending' && (
                  <button
                    onClick={() => revokeInvitation(invitation.id)}
                    className="ml-4 text-red-600 hover:text-red-700"
                  >
                    취소
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 초대 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold mb-4">새 초대 생성</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 (선택사항)
                </label>
                <input
                  type="email"
                  value={newInvitation.email}
                  onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  특정 이메일로만 사용 가능한 초대를 생성합니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  유효 기간
                </label>
                <select
                  value={newInvitation.expiresInDays}
                  onChange={(e) => setNewInvitation({ ...newInvitation, expiresInDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value={1}>1일</option>
                  <option value={3}>3일</option>
                  <option value={7}>7일</option>
                  <option value={14}>14일</option>
                  <option value={30}>30일</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  권한 설정
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newInvitation.permissions.viewProject}
                      onChange={(e) => setNewInvitation({
                        ...newInvitation,
                        permissions: { ...newInvitation.permissions, viewProject: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">프로젝트 정보 보기</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newInvitation.permissions.viewTasks}
                      onChange={(e) => setNewInvitation({
                        ...newInvitation,
                        permissions: { ...newInvitation.permissions, viewTasks: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">작업 목록 보기</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newInvitation.permissions.viewFiles}
                      onChange={(e) => setNewInvitation({
                        ...newInvitation,
                        permissions: { ...newInvitation.permissions, viewFiles: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">파일 보기</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newInvitation.permissions.viewChat}
                      onChange={(e) => setNewInvitation({
                        ...newInvitation,
                        permissions: { ...newInvitation.permissions, viewChat: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">채팅 참여</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={createInvitation}
                className="flex-1 btn btn-primary"
              >
                생성
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}