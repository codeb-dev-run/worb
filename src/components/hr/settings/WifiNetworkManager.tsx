'use client'

import React, { useState, useEffect } from 'react'
import { Wifi, Plus, Trash2, Signal, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface WifiNetwork {
  id: string
  name: string
  ssid: string
  bssid?: string | null
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string
  }
}

interface WifiNetworkManagerProps {
  workspaceId: string
  enabled: boolean
  required: boolean
  onEnabledChange: (enabled: boolean) => void
  onRequiredChange: (required: boolean) => void
}

export function WifiNetworkManager({
  workspaceId,
  enabled,
  required,
  onEnabledChange,
  onRequiredChange,
}: WifiNetworkManagerProps) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 새 네트워크 추가 폼
  const [newName, setNewName] = useState('')
  const [newSSID, setNewSSID] = useState('')
  const [newBSSID, setNewBSSID] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // 현재 연결된 WiFi 정보 (Navigator API 사용 - 브라우저에서 제한적)
  const [currentWifi, setCurrentWifi] = useState<{ ssid: string; detected: boolean } | null>(null)

  // WiFi 네트워크 목록 조회
  useEffect(() => {
    fetchNetworks()
  }, [workspaceId])

  const fetchNetworks = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/attendance/wifi?workspaceId=${workspaceId}`)
      if (!res.ok) throw new Error('Failed to fetch networks')
      const data = await res.json()
      setNetworks(data.networks || [])
    } catch (err) {
      setError('WiFi 네트워크 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 네트워크 추가
  const handleAddNetwork = async () => {
    if (!newName.trim() || !newSSID.trim()) {
      setError('네트워크 이름과 SSID를 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const res = await fetch('/api/attendance/wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: newName.trim(),
          ssid: newSSID.trim(),
          bssid: newBSSID.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to add network')
      }

      const newNetwork = await res.json()
      setNetworks(prev => [newNetwork, ...prev])
      setNewName('')
      setNewSSID('')
      setNewBSSID('')
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message || 'WiFi 네트워크 추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 네트워크 삭제
  const handleDeleteNetwork = async (id: string) => {
    if (!confirm('이 WiFi 네트워크를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/attendance/wifi/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete network')

      setNetworks(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      setError('WiFi 네트워크 삭제에 실패했습니다.')
    }
  }

  // 네트워크 활성화/비활성화 토글
  const handleToggleNetwork = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/attendance/wifi/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!res.ok) throw new Error('Failed to update network')

      const updated = await res.json()
      setNetworks(prev => prev.map(n => n.id === id ? updated : n))
    } catch (err) {
      setError('WiFi 네트워크 상태 변경에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-4">
      {/* WiFi 검증 활성화 토글 */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-3">
          <Wifi className="w-5 h-5 text-lime-600" />
          <div>
            <div className="font-medium">WiFi 기반 출퇴근 검증</div>
            <div className="text-sm text-slate-500">
              등록된 사무실 WiFi에서만 사무실 출근이 가능합니다
            </div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
        </label>
      </div>

      {enabled && (
        <>
          {/* 필수 여부 토글 */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                사무실 출근 시 WiFi 검증 필수
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => onRequiredChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-sm">
              {error}
            </div>
          )}

          {/* 네트워크 추가 버튼 */}
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-black text-lime-400 hover:bg-slate-800 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              사무실 WiFi 추가
            </Button>
          )}

          {/* 네트워크 추가 폼 */}
          {showAddForm && (
            <div className="p-4 bg-lime-50 rounded-xl border border-lime-200 space-y-3">
              <h4 className="font-medium text-lime-800">새 WiFi 네트워크 등록</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    표시 이름 *
                  </label>
                  <Input
                    placeholder="예: 본사 1층"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    WiFi 이름 (SSID) *
                  </label>
                  <Input
                    placeholder="예: Company_WiFi_5G"
                    value={newSSID}
                    onChange={(e) => setNewSSID(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  MAC 주소 (BSSID) - 선택사항
                </label>
                <Input
                  placeholder="예: AA:BB:CC:DD:EE:FF"
                  value={newBSSID}
                  onChange={(e) => setNewBSSID(e.target.value)}
                  className="bg-white"
                />
                <p className="text-xs text-slate-400 mt-1">
                  더 정확한 검증을 위해 MAC 주소를 입력하면 동일한 이름의 다른 WiFi와 구분됩니다.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAddNetwork}
                  disabled={saving || !newName.trim() || !newSSID.trim()}
                  className="flex-1 bg-lime-600 hover:bg-lime-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      등록
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewName('')
                    setNewSSID('')
                    setNewBSSID('')
                    setError(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          {/* 등록된 네트워크 목록 */}
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">
              등록된 사무실 WiFi ({networks.length}개)
            </h4>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                불러오는 중...
              </div>
            ) : networks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Wifi className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>등록된 WiFi 네트워크가 없습니다.</p>
                <p className="text-sm">위에서 사무실 WiFi를 추가해주세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {networks.map((network) => (
                  <div
                    key={network.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      network.isActive
                        ? 'bg-white border-slate-200'
                        : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        network.isActive ? 'bg-lime-100' : 'bg-slate-200'
                      }`}>
                        <Signal className={`w-4 h-4 ${
                          network.isActive ? 'text-lime-600' : 'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {network.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          SSID: <code className="bg-slate-100 px-1 rounded">{network.ssid}</code>
                          {network.bssid && (
                            <span className="ml-2">
                              BSSID: <code className="bg-slate-100 px-1 rounded">{network.bssid}</code>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={network.isActive ? 'default' : 'secondary'}
                        className={network.isActive ? 'bg-lime-100 text-lime-700' : ''}
                        onClick={() => handleToggleNetwork(network.id, network.isActive)}
                        style={{ cursor: 'pointer' }}
                      >
                        {network.isActive ? '활성' : '비활성'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNetwork(network.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm text-blue-700">
            <p className="font-medium mb-1">WiFi 검증 작동 방식</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>직원이 출근 시 연결된 WiFi 정보를 서버로 전송합니다</li>
              <li>등록된 WiFi SSID와 일치하면 &ldquo;사무실 출근&rdquo;으로 인정됩니다</li>
              <li>일치하지 않으면 &ldquo;재택 근무&rdquo;로 분류됩니다</li>
              <li>필수 설정 시, 미인증 WiFi에서는 사무실 출근이 불가합니다</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
