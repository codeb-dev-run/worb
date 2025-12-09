import React, { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, Wifi, Globe, Info } from 'lucide-react'
import { AdvancedWorkSettings, WorkType } from '@/types/hr'
import { InputField, ToggleSwitch } from './SharedComponents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function WorkSettingsSection({
    settings,
    onChange
}: {
    settings: AdvancedWorkSettings
    onChange: (path: string, value: any) => void
}) {
    const [currentIP, setCurrentIP] = useState<string>('')
    const [newIP, setNewIP] = useState('')
    const [loadingIP, setLoadingIP] = useState(true)

    // 현재 IP 조회
    useEffect(() => {
        const fetchCurrentIP = async () => {
            try {
                const res = await fetch('https://api.ipify.org?format=json')
                const data = await res.json()
                setCurrentIP(data.ip)
            } catch (e) {
                console.error('Failed to fetch IP:', e)
                setCurrentIP('조회 실패')
            } finally {
                setLoadingIP(false)
            }
        }
        fetchCurrentIP()
    }, [])

    // IP 추가
    const handleAddIP = (ip: string) => {
        if (!ip || !ip.trim()) return
        const trimmedIP = ip.trim()

        // 중복 체크
        if (settings.verification.officeIpWhitelist.includes(trimmedIP)) {
            return
        }

        const newList = [...settings.verification.officeIpWhitelist, trimmedIP]
        onChange('workSettings.verification.officeIpWhitelist', newList)
        setNewIP('')
    }

    // IP 삭제
    const handleRemoveIP = (ip: string) => {
        const newList = settings.verification.officeIpWhitelist.filter(i => i !== ip)
        onChange('workSettings.verification.officeIpWhitelist', newList)
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-lime-600" />
                근무 시간 설정
            </h3>

            {/* 근무 유형 */}
            <div className="grid grid-cols-3 gap-4">
                {(['FIXED', 'FLEXIBLE', 'AUTONOMOUS'] as WorkType[]).map(type => (
                    <button
                        key={type}
                        onClick={() => onChange('workSettings.workSchedule.type', type)}
                        className={`p-4 rounded-xl border-2 text-center ${settings.workSchedule.type === type
                                ? 'border-lime-400 bg-lime-50'
                                : 'border-slate-200'
                            }`}
                    >
                        <div className="font-medium">
                            {type === 'FIXED' ? '고정 근로' : type === 'FLEXIBLE' ? '유연 근로' : '자율 근무'}
                        </div>
                    </button>
                ))}
            </div>

            {/* 시간 설정 */}
            <div className="grid grid-cols-2 gap-4">
                <InputField
                    label="출근 시간"
                    type="time"
                    value={settings.workSchedule.workStartTime}
                    onChange={(v) => onChange('workSettings.workSchedule.workStartTime', v)}
                />
                <InputField
                    label="퇴근 시간"
                    type="time"
                    value={settings.workSchedule.workEndTime}
                    onChange={(v) => onChange('workSettings.workSchedule.workEndTime', v)}
                />
                <InputField
                    label="일 소정근로시간 (분)"
                    type="number"
                    value={settings.workSchedule.dailyRequiredMinutes}
                    onChange={(v) => onChange('workSettings.workSchedule.dailyRequiredMinutes', parseInt(v))}
                />
                <InputField
                    label="주 소정근로시간"
                    type="number"
                    value={settings.workSchedule.weeklyRequiredHours}
                    onChange={(v) => onChange('workSettings.workSchedule.weeklyRequiredHours', parseInt(v))}
                />
            </div>

            {/* 유연근무 코어타임 */}
            {settings.workSchedule.type === 'FLEXIBLE' && (
                <div className="p-4 bg-lime-50 rounded-xl border border-lime-200">
                    <h4 className="font-medium mb-3">코어타임 설정</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField
                            label="코어타임 시작"
                            type="time"
                            value={settings.workSchedule.coreTimeStart || '10:00'}
                            onChange={(v) => onChange('workSettings.workSchedule.coreTimeStart', v)}
                        />
                        <InputField
                            label="코어타임 종료"
                            type="time"
                            value={settings.workSchedule.coreTimeEnd || '16:00'}
                            onChange={(v) => onChange('workSettings.workSchedule.coreTimeEnd', v)}
                        />
                    </div>
                </div>
            )}

            {/* 점심시간 */}
            <div className="grid grid-cols-3 gap-4">
                <InputField
                    label="점심 시작"
                    type="time"
                    value={settings.workSchedule.lunchBreakStart}
                    onChange={(v) => onChange('workSettings.workSchedule.lunchBreakStart', v)}
                />
                <InputField
                    label="점심 종료"
                    type="time"
                    value={settings.workSchedule.lunchBreakEnd}
                    onChange={(v) => onChange('workSettings.workSchedule.lunchBreakEnd', v)}
                />
                <InputField
                    label="점심 시간 (분)"
                    type="number"
                    value={settings.workSchedule.lunchBreakMinutes}
                    onChange={(v) => onChange('workSettings.workSchedule.lunchBreakMinutes', parseInt(v))}
                />
            </div>

            {/* 인증 설정 */}
            <div className="border-t pt-6 mt-6">
                <h4 className="font-medium mb-4">출퇴근 인증 설정</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span>재석 확인 기능</span>
                        <ToggleSwitch
                            checked={settings.verification.presenceCheckEnabled}
                            onChange={(v) => onChange('workSettings.verification.presenceCheckEnabled', v)}
                        />
                    </div>
                    {settings.verification.presenceCheckEnabled && (
                        <InputField
                            label="재석 확인 간격 (분)"
                            type="number"
                            value={settings.verification.presenceIntervalMinutes}
                            onChange={(v) => onChange('workSettings.verification.presenceIntervalMinutes', parseInt(v))}
                        />
                    )}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span>GPS 위치 인증</span>
                        <ToggleSwitch
                            checked={settings.verification.gpsEnabled}
                            onChange={(v) => onChange('workSettings.verification.gpsEnabled', v)}
                        />
                    </div>
                    {settings.verification.gpsEnabled && (
                        <InputField
                            label="GPS 인증 반경 (m)"
                            type="number"
                            value={settings.verification.gpsRadius}
                            onChange={(v) => onChange('workSettings.verification.gpsRadius', parseInt(v))}
                        />
                    )}

                    {/* WiFi/IP 인증 토글 */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2">
                            <Wifi className="w-4 h-4 text-slate-500" />
                            <span>WiFi/IP 인증</span>
                        </div>
                        <ToggleSwitch
                            checked={settings.verification.wifiEnabled}
                            onChange={(v) => onChange('workSettings.verification.wifiEnabled', v)}
                        />
                    </div>

                    {/* WiFi/IP 인증 활성화 시 상세 설정 */}
                    {settings.verification.wifiEnabled && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                            <div className="flex items-center gap-2 text-blue-700">
                                <Info className="w-4 h-4" />
                                <span className="text-sm font-medium">사무실 IP를 등록하면 해당 IP에서만 출근/퇴근이 가능합니다</span>
                            </div>

                            {/* 현재 IP 표시 */}
                            <div className="p-3 bg-white rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm text-slate-600">현재 접속 IP</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {loadingIP ? (
                                            <span className="text-sm text-slate-400">조회 중...</span>
                                        ) : (
                                            <>
                                                <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-700">
                                                    {currentIP}
                                                </code>
                                                {!settings.verification.officeIpWhitelist.includes(currentIP) && currentIP !== '조회 실패' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleAddIP(currentIP)}
                                                        className="h-7 text-xs border-lime-300 text-lime-700 hover:bg-lime-50"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        추가
                                                    </Button>
                                                )}
                                                {settings.verification.officeIpWhitelist.includes(currentIP) && (
                                                    <Badge className="bg-lime-100 text-lime-700 border-lime-200">등록됨</Badge>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* IP 직접 입력 */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="IP 주소 입력 (예: 123.456.789.012)"
                                    value={newIP}
                                    onChange={(e) => setNewIP(e.target.value)}
                                    className="flex-1 bg-white border-slate-200 rounded-xl"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleAddIP(newIP)
                                        }
                                    }}
                                />
                                <Button
                                    onClick={() => handleAddIP(newIP)}
                                    disabled={!newIP.trim()}
                                    className="bg-black text-lime-400 hover:bg-slate-800 rounded-xl"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    추가
                                </Button>
                            </div>

                            {/* 등록된 IP 목록 */}
                            {settings.verification.officeIpWhitelist.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-sm font-medium text-slate-600">등록된 사무실 IP</span>
                                    <div className="space-y-2">
                                        {settings.verification.officeIpWhitelist.map((ip, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="w-4 h-4 text-lime-500" />
                                                    <code className="text-sm font-mono text-slate-700">{ip}</code>
                                                    {ip === currentIP && (
                                                        <Badge variant="outline" className="text-xs border-lime-300 text-lime-600">현재 IP</Badge>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveIP(ip)}
                                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settings.verification.officeIpWhitelist.length === 0 && (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                    등록된 IP가 없습니다. 위에서 IP를 추가해주세요.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 지각 정책 */}
            <div className="border-t pt-6 mt-6">
                <h4 className="font-medium mb-4">지각/조퇴 규정</h4>
                <div className="grid grid-cols-3 gap-4">
                    <InputField
                        label="지각 유예 시간 (분)"
                        type="number"
                        value={settings.latePolicy.graceMinutes}
                        onChange={(v) => onChange('workSettings.latePolicy.graceMinutes', parseInt(v))}
                    />
                    <InputField
                        label="지각 1회당 공제액"
                        type="number"
                        value={settings.latePolicy.deductionPerLate}
                        onChange={(v) => onChange('workSettings.latePolicy.deductionPerLate', parseInt(v))}
                    />
                    <InputField
                        label="월 최대 지각 허용"
                        type="number"
                        value={settings.latePolicy.maxLatePerMonth}
                        onChange={(v) => onChange('workSettings.latePolicy.maxLatePerMonth', parseInt(v))}
                    />
                </div>
            </div>
        </div>
    )
}
