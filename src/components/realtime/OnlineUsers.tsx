'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface OnlineUser {
  id: string
  name?: string
  email?: string
  avatar?: string
}

interface OnlineUsersProps {
  users: OnlineUser[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showTooltip?: boolean
}

// 사용자 초기 생성
const getInitials = (name?: string, email?: string) => {
  if (name) {
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '?'
}

// 랜덤 색상 생성 (사용자별 고유 색상)
const getColorFromId = (id: string) => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]

  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }

  return colors[Math.abs(hash) % colors.length]
}

export default function OnlineUsers({
  users,
  maxDisplay = 5,
  size = 'md',
  className,
  showTooltip = true,
}: OnlineUsersProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  }

  const ringColors = [
    'ring-red-400',
    'ring-orange-400',
    'ring-lime-400',
    'ring-cyan-400',
    'ring-violet-400',
    'ring-pink-400',
  ]

  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = users.length - maxDisplay

  if (users.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        {/* 온라인 표시 */}
        <div className="flex items-center gap-1.5 mr-3 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{users.length}명 접속</span>
        </div>

        {/* 사용자 아바타 */}
        <div className="flex -space-x-2">
          {displayUsers.map((user, index) => {
            const ringColor = ringColors[index % ringColors.length]
            const bgColor = getColorFromId(user.id)

            const avatar = (
              <Avatar
                key={user.id}
                className={cn(
                  sizeClasses[size],
                  'ring-2 ring-white',
                  'transition-transform hover:scale-110 hover:z-10',
                  'cursor-pointer'
                )}
              >
                <AvatarImage src={user.avatar} alt={user.name || user.email} />
                <AvatarFallback className={cn(bgColor, 'text-white font-medium')}>
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            )

            if (showTooltip) {
              return (
                <Tooltip key={user.id}>
                  <TooltipTrigger asChild>
                    {avatar}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-900 text-white">
                    <p className="font-medium">{user.name || '익명 사용자'}</p>
                    {user.email && <p className="text-xs text-slate-400">{user.email}</p>}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return avatar
          })}

          {/* 나머지 사용자 수 */}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    sizeClasses[size],
                    'rounded-full bg-slate-200 text-slate-600 font-medium',
                    'flex items-center justify-center',
                    'ring-2 ring-white',
                    'cursor-pointer hover:bg-slate-300 transition-colors'
                  )}
                >
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white">
                <p className="font-medium">외 {remainingCount}명</p>
                <div className="text-xs text-slate-400 mt-1">
                  {users.slice(maxDisplay).map(u => u.name || u.email || '익명').join(', ')}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Export type for use in other components
export type { OnlineUser }
