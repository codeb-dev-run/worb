'use client'

// ===========================================
// Preferences Tab Component
// ===========================================

import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  PreferencesSettings,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  DATE_FORMAT_OPTIONS
} from '../types'

interface PreferencesTabProps {
  settings: PreferencesSettings
  onUpdate: (field: string, value: unknown) => void
}

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor
}

export function PreferencesTab({ settings, onUpdate }: PreferencesTabProps) {
  return (
    <div className="space-y-4 mt-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900">표시 설정</CardTitle>
          <CardDescription className="text-slate-500">인터페이스 표시 방법을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div>
            <Label className="mb-3 text-slate-700">테마</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {(['light', 'dark', 'system'] as const).map((theme) => {
                const Icon = THEME_ICONS[theme]
                const labels = { light: '라이트', dark: '다크', system: '시스템' }
                return (
                  <button
                    key={theme}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      settings.theme === theme
                        ? 'bg-black text-lime-400 shadow-lg'
                        : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                    onClick={() => onUpdate('theme', theme)}
                  >
                    <Icon className="h-4 w-4" />
                    {labels[theme]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language */}
          <div>
            <Label className="text-slate-700">언어</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => onUpdate('language', lang.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.language === lang.value
                      ? 'bg-lime-100 text-lime-700 ring-2 ring-lime-400'
                      : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <span>{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <Label className="text-slate-700">시간대</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TIMEZONE_OPTIONS.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  onClick={() => onUpdate('timezone', tz.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.timezone === tz.value
                      ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-400'
                      : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Format */}
          <div>
            <Label className="text-slate-700">날짜 형식</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DATE_FORMAT_OPTIONS.map((df) => (
                <button
                  key={df.value}
                  type="button"
                  onClick={() => onUpdate('dateFormat', df.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.dateFormat === df.value
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                      : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
            <div>
              <p className="font-medium text-slate-900">컴팩트 모드</p>
              <p className="text-sm text-slate-500">더 많은 콘텐츠를 한 화면에 표시합니다</p>
            </div>
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(checked) => onUpdate('compactMode', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
