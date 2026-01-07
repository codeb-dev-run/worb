'use client'

// ===========================================
// Security Tab Component
// ===========================================

import React from 'react'
import { Shield, Key, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SecuritySettings, SESSION_TIMEOUT_OPTIONS, PASSWORD_EXPIRY_OPTIONS } from '../types'

interface SecurityTabProps {
  settings: SecuritySettings
  onUpdate: (field: string, value: unknown) => void
}

export function SecurityTab({ settings, onUpdate }: SecurityTabProps) {
  return (
    <div className="space-y-4 mt-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900">계정 보안</CardTitle>
          <CardDescription className="text-slate-500">계정을 안전하게 보호하는 설정입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA */}
          <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-lime-100 rounded-xl">
                <Shield className="h-5 w-5 text-lime-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">2단계 인증</p>
                <p className="text-sm text-slate-500">
                  {settings.twoFactorEnabled ? '활성화됨' : '비활성화됨'}
                </p>
              </div>
            </div>
            <Button
              variant={settings.twoFactorEnabled ? 'glass' : 'limePrimary'}
              className="rounded-xl"
            >
              {settings.twoFactorEnabled ? '비활성화' : '활성화'}
            </Button>
          </div>

          {/* Session Timeout */}
          <div>
            <Label className="text-slate-700">세션 타임아웃</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SESSION_TIMEOUT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdate('sessionTimeout', option.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.sessionTimeout === option.value
                      ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                      : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Password Expiry */}
          <div>
            <Label className="text-slate-700">비밀번호 변경 주기</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PASSWORD_EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdate('passwordExpiry', option.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.passwordExpiry === option.value
                      ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400'
                      : 'bg-white/60 border border-white/40 text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Login Alerts */}
          <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-white/40">
            <Label htmlFor="loginAlerts" className="cursor-pointer text-slate-700">
              로그인 알림
            </Label>
            <Switch
              id="loginAlerts"
              checked={settings.loginAlerts}
              onCheckedChange={(checked) => onUpdate('loginAlerts', checked)}
            />
          </div>

          {/* Action buttons */}
          <div className="border-t border-white/40 pt-6 space-y-3">
            <Button variant="glass" className="w-full justify-start rounded-xl">
              <Key className="h-4 w-4 mr-2 text-lime-600" />
              비밀번호 변경
            </Button>
            <Button variant="glass" className="w-full justify-start rounded-xl">
              <RefreshCcw className="h-4 w-4 mr-2 text-violet-600" />
              활성 세션 관리
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
