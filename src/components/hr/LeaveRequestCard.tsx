'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  CalendarDays, Clock, Heart, Umbrella, Baby, Briefcase,
  CheckCircle, XCircle, User
} from 'lucide-react'
import { LeaveRequestWithEmployee } from '@/types/hr'

interface LeaveRequestCardProps {
  request: LeaveRequestWithEmployee
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  showActions?: boolean
  compact?: boolean
}

const leaveTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  annual: { label: '연차', icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
  sick: { label: '병가', icon: Heart, color: 'text-red-600 bg-red-50' },
  half_am: { label: '오전 반차', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  half_pm: { label: '오후 반차', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  special: { label: '특별휴가', icon: Umbrella, color: 'text-purple-600 bg-purple-50' },
  maternity: { label: '출산휴가', icon: Baby, color: 'text-pink-600 bg-pink-50' },
  childcare: { label: '육아휴직', icon: Baby, color: 'text-pink-600 bg-pink-50' },
  official: { label: '공가', icon: Briefcase, color: 'text-slate-600 bg-slate-50' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: '승인', color: 'bg-lime-100 text-lime-700 border-lime-200' },
  rejected: { label: '반려', color: 'bg-red-100 text-red-700 border-red-200' },
}

export default function LeaveRequestCard({
  request,
  onApprove,
  onReject,
  showActions = true,
  compact = false,
}: LeaveRequestCardProps) {
  const typeConfig = leaveTypeConfig[request.type] || leaveTypeConfig.annual
  const statusConf = statusConfig[request.status] || statusConfig.pending
  const TypeIcon = typeConfig.icon

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2)
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/60 hover:bg-white/70 transition-colors">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={request.employee.profileImage || undefined} />
            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
              {getInitials(request.employee.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 text-sm">{request.employee.name}</span>
              <Badge variant="outline" className={`text-xs ${typeConfig.color} border-0`}>
                {typeConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {formatDate(request.startDate)}
              {request.startDate !== request.endDate && ` ~ ${formatDate(request.endDate)}`}
              {request.days && ` (${request.days}일)`}
            </p>
          </div>
        </div>
        {showActions && request.status === 'pending' && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
              onClick={() => onReject?.(request.id)}
            >
              <XCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-lime-600 hover:bg-lime-50"
              onClick={() => onApprove?.(request.id)}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
        {!showActions && <Badge className={statusConf.color}>{statusConf.label}</Badge>}
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-white/50 border border-white/60 hover:bg-white/70 transition-colors">
      <div className="flex items-start justify-between">
        {/* 신청자 정보 */}
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={request.employee.profileImage || undefined} />
            <AvatarFallback className="bg-slate-100 text-slate-600">
              {getInitials(request.employee.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-slate-900">{request.employee.name}</span>
              {request.employee.department && (
                <span className="text-sm text-slate-500">
                  {request.employee.department}
                  {request.employee.position && ` · ${request.employee.position}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${typeConfig.color} border-0`}>
                <TypeIcon className="w-3 h-3 mr-1" />
                {typeConfig.label}
              </Badge>
              <span className="text-sm text-slate-600">
                {formatDate(request.startDate)}
                {request.startDate !== request.endDate && ` ~ ${formatDate(request.endDate)}`}
              </span>
              {request.days && (
                <span className="text-sm font-medium text-slate-700">
                  {request.days}일
                </span>
              )}
            </div>
            {request.reason && (
              <p className="mt-2 text-sm text-slate-600 bg-slate-50/50 rounded-lg px-3 py-2">
                &ldquo;{request.reason}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* 상태 및 액션 */}
        <div className="flex flex-col items-end gap-2">
          <Badge className={statusConf.color}>{statusConf.label}</Badge>

          {showActions && request.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onReject?.(request.id)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                반려
              </Button>
              <Button
                size="sm"
                className="bg-lime-500 text-white hover:bg-lime-600"
                onClick={() => onApprove?.(request.id)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                승인
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 신청일 */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>신청일: {request.createdAt}</span>
        {request.approvedAt && (
          <span>처리일: {request.approvedAt}</span>
        )}
      </div>
    </div>
  )
}
