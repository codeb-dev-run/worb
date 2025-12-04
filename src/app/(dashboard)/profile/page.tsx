'use client'

// ===========================================
// Glass Morphism Profile Page
// ===========================================

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  User, Mail, Phone, Building, Camera, Save,
  Loader2, AlertCircle, Shield, Key, Clock,
  Calendar, Briefcase, MapPin
} from 'lucide-react'

interface ProfileData {
  displayName: string
  email: string
  phone: string
  company: string
  department: string
  position: string
  bio: string
  avatar: string
  location: string
}

const defaultProfile: ProfileData = {
  displayName: '',
  email: '',
  phone: '',
  company: '',
  department: '',
  position: '',
  bio: '',
  avatar: '',
  location: ''
}

export default function ProfilePage() {
  const { user, userProfile } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [profile, setProfile] = useState<ProfileData>(defaultProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // 프로필 데이터 로드
  useEffect(() => {
    if (!user) return

    setProfile(prev => ({
      ...prev,
      email: user.email || '',
      displayName: userProfile?.displayName || user.displayName || '',
      phone: userProfile?.phone || '',
      company: userProfile?.company || '',
      department: userProfile?.department || '',
      avatar: userProfile?.avatar || ''
    }))
    setLoading(false)
  }, [user, userProfile])

  const handleSave = async () => {
    setSaving(true)

    try {
      // API 호출로 프로필 저장
      const response = await fetch('/api/employees/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          phone: profile.phone,
          company: profile.company,
          department: profile.department,
          bio: profile.bio,
          location: profile.location
        })
      })

      if (response.ok) {
        toast.success('프로필이 저장되었습니다.')
        setHasChanges(false)
      } else {
        toast.error('프로필 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleAvatarUpload = () => {
    // TODO: 아바타 업로드 기능 구현
    toast.error('아바타 업로드 기능은 준비 중입니다.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto" />
          <p className="mt-4 text-slate-500">프로필을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-lime-100 rounded-xl">
              <User className="w-6 h-6 text-lime-600" />
            </div>
            내 프로필
          </h1>
          <p className="text-slate-500 mt-2">프로필 정보를 확인하고 수정할 수 있습니다</p>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-3">
            <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200">
              <AlertCircle className="h-3 w-3" />
              변경사항 있음
            </Badge>
            <Button variant="limePrimary" onClick={handleSave} disabled={saving} className="rounded-xl">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        )}
      </div>

      {/* 프로필 카드 */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900">기본 정보</CardTitle>
          <CardDescription className="text-slate-500">다른 사용자에게 표시되는 정보입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 아바타 및 기본 정보 */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              <div className="w-28 h-28 bg-lime-100 rounded-2xl flex items-center justify-center shadow-lg">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Avatar"
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-lime-600">
                    {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <Button
                size="icon"
                variant="glass"
                className="absolute -bottom-2 -right-2 rounded-xl shadow-lg"
                onClick={handleAvatarUpload}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{profile.displayName || '이름 없음'}</h2>
                <p className="text-slate-500">{profile.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {userProfile?.role && (
                  <Badge className="bg-lime-100 text-lime-700 border-lime-200">
                    {userProfile.role === 'admin' ? '관리자' : '멤버'}
                  </Badge>
                )}
                {currentWorkspace && (
                  <Badge variant="outline" className="text-slate-600">
                    {currentWorkspace.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* 입력 필드들 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <Label htmlFor="displayName">표시 이름</Label>
              <Input
                id="displayName"
                value={profile.displayName}
                onChange={(e) => updateProfile('displayName', e.target.value)}
                placeholder="홍길동"
              />
            </div>

            <div>
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="pr-10 bg-slate-50"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">전화번호</Label>
              <div className="relative">
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  placeholder="010-1234-5678"
                />
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="company">회사</Label>
              <div className="relative">
                <Input
                  id="company"
                  value={profile.company}
                  onChange={(e) => updateProfile('company', e.target.value)}
                  placeholder="코드비"
                />
                <Building className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="department">부서</Label>
              <div className="relative">
                <Input
                  id="department"
                  value={profile.department}
                  onChange={(e) => updateProfile('department', e.target.value)}
                  placeholder="개발팀"
                />
                <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <Label htmlFor="location">위치</Label>
              <div className="relative">
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => updateProfile('location', e.target.value)}
                  placeholder="서울, 대한민국"
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">소개</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => updateProfile('bio', e.target.value)}
              placeholder="간단한 자기소개를 작성해주세요"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 계정 정보 카드 */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" />
            계정 정보
          </CardTitle>
          <CardDescription className="text-slate-500">계정 및 보안 관련 정보입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-white/40">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">가입일</p>
                <p className="font-medium text-slate-900">
                  {userProfile?.createdAt
                    ? new Date(userProfile.createdAt).toLocaleDateString('ko-KR')
                    : '-'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-white/40">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">마지막 로그인</p>
                <p className="font-medium text-slate-900">
                  {userProfile?.lastLogin
                    ? new Date(userProfile.lastLogin).toLocaleDateString('ko-KR')
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button variant="glass" className="rounded-xl">
              <Key className="h-4 w-4 mr-2 text-lime-600" />
              비밀번호 변경
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
