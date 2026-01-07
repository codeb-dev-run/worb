'use client'

// ===========================================
// Notifications Tab Component
// ===========================================

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  NotificationSettings,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES
} from '../types'

interface NotificationsTabProps {
  settings: NotificationSettings
  onUpdate: (field: string, value: boolean) => void
}

export function NotificationsTab({ settings, onUpdate }: NotificationsTabProps) {
  return (
    <div className="space-y-4 mt-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900">알림 채널</CardTitle>
          <CardDescription className="text-slate-500">알림을 받을 방법을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CHANNELS.map(channel => {
            const Icon = channel.icon
            return (
              <div
                key={channel.key}
                className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${channel.iconBg} rounded-xl`}>
                    <Icon className={`h-5 w-5 ${channel.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{channel.title}</p>
                    <p className="text-sm text-slate-500">{channel.description}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[channel.key] as boolean}
                  onCheckedChange={(checked) => onUpdate(channel.key, checked)}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900">알림 유형</CardTitle>
          <CardDescription className="text-slate-500">받고 싶은 알림 유형을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NOTIFICATION_TYPES.map(type => {
              const Icon = type.icon
              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40"
                >
                  <Label
                    htmlFor={type.key}
                    className="flex items-center gap-2 cursor-pointer text-slate-700"
                  >
                    <Icon className={`h-4 w-4 ${type.iconColor}`} />
                    {type.label}
                  </Label>
                  <Switch
                    id={type.key}
                    checked={settings[type.key] as boolean}
                    onCheckedChange={(checked) => onUpdate(type.key, checked)}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
