'use client'

// ===========================================
// Privacy Tab Component
// ===========================================

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PrivacySettings, VISIBILITY_OPTIONS } from '../types'

interface PrivacyTabProps {
  settings: PrivacySettings
  onUpdate: (field: string, value: unknown) => void
}

export function PrivacyTab({ settings, onUpdate }: PrivacyTabProps) {
  return (
    <div className="space-y-4 mt-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900">프로필 공개 설정</CardTitle>
          <CardDescription className="text-slate-500">프로필 정보 공개 범위를 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visibility */}
          <div>
            <Label className="text-slate-700">프로필 공개 범위</Label>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {VISIBILITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    settings.profileVisibility === option.value
                      ? 'bg-black text-lime-400 shadow-lg'
                      : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                  onClick={() => onUpdate('profileVisibility', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy toggles */}
          <div className="border-t border-white/40 pt-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
              <Label htmlFor="showEmail" className="cursor-pointer text-slate-700">
                이메일 주소 공개
              </Label>
              <Switch
                id="showEmail"
                checked={settings.showEmail}
                onCheckedChange={(checked) => onUpdate('showEmail', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
              <Label htmlFor="showPhone" className="cursor-pointer text-slate-700">
                전화번호 공개
              </Label>
              <Switch
                id="showPhone"
                checked={settings.showPhone}
                onCheckedChange={(checked) => onUpdate('showPhone', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
              <Label htmlFor="activityStatus" className="cursor-pointer text-slate-700">
                활동 상태 표시
              </Label>
              <Switch
                id="activityStatus"
                checked={settings.activityStatus}
                onCheckedChange={(checked) => onUpdate('activityStatus', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
              <Label htmlFor="readReceipts" className="cursor-pointer text-slate-700">
                읽음 확인 표시
              </Label>
              <Switch
                id="readReceipts"
                checked={settings.readReceipts}
                onCheckedChange={(checked) => onUpdate('readReceipts', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
