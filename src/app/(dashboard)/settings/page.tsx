'use client'

// ===========================================
// Glass Morphism Settings Page (Refactored)
// 1175줄 → ~150줄 (타입/훅/컴포넌트 분리)
// ===========================================

import React from 'react'
import { User, Save, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import WorkspaceInvitations from '@/components/workspace/WorkspaceInvitations'

// Types
import { SETTINGS_TABS } from './types'

// Hooks
import { useSettingsData } from './hooks'

// Components
import {
  NotificationsTab,
  PreferencesTab,
  PrivacyTab,
  SecurityTab,
  FeaturesTab
} from './components'

export default function SettingsPage() {
  const {
    settings,
    workspaceFeatures,
    loading,
    saving,
    savingFeatures,
    activeTab,
    hasChanges,
    hasFeatureChanges,
    currentWorkspace,
    isAdmin,
    setActiveTab,
    updateSettings,
    updateWorkspaceFeature,
    handleSave,
    handleSaveFeatures,
  } = useSettingsData()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-lime-400 mx-auto" />
          <p className="mt-4 text-slate-500">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-lime-100 rounded-xl">
              <User className="w-6 h-6 text-lime-600" />
            </div>
            설정
          </h1>
          <p className="text-slate-500 mt-2">계정 및 환경 설정을 관리합니다</p>
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

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tab Navigation */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-black/5 p-1.5 border border-white/40 max-w-[1000px]">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {SETTINGS_TABS.filter(tab => !tab.adminOnly || isAdmin).map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-black text-lime-400 shadow-lg'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationsTab
            settings={settings.notifications}
            onUpdate={(field, value) => updateSettings('notifications', field, value)}
          />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <PreferencesTab
            settings={settings.preferences}
            onUpdate={(field, value) => updateSettings('preferences', field, value)}
          />
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <PrivacyTab
            settings={settings.privacy}
            onUpdate={(field, value) => updateSettings('privacy', field, value)}
          />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecurityTab
            settings={settings.security}
            onUpdate={(field, value) => updateSettings('security', field, value)}
          />
        </TabsContent>

        {/* Members Tab */}
        {currentWorkspace?.id && (
          <TabsContent value="members" className="space-y-4 mt-6">
            <Card variant="glass">
              <CardContent className="pt-6">
                <WorkspaceInvitations workspaceId={currentWorkspace.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Features Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="features">
            <FeaturesTab
              workspaceFeatures={workspaceFeatures}
              currentWorkspace={currentWorkspace}
              hasFeatureChanges={hasFeatureChanges}
              savingFeatures={savingFeatures}
              onUpdate={updateWorkspaceFeature}
              onSave={handleSaveFeatures}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
