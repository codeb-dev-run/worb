'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, User, Users } from 'lucide-react'
import { NewEventForm, ProjectOption, CALENDAR_COLORS } from '../../types'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  newEvent: NewEventForm
  projects: ProjectOption[]
  onEventChange: (event: NewEventForm) => void
  onSave: () => void
}

export function EventModal({
  isOpen,
  onClose,
  newEvent,
  projects,
  onEventChange,
  onSave
}: EventModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900">새 일정 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">제목</Label>
            <Input
              value={newEvent.title}
              onChange={(e) => onEventChange({ ...newEvent, title: e.target.value })}
              placeholder="일정 제목"
              className="rounded-xl h-11"
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">유형</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEventChange({ ...newEvent, type: 'personal', projectId: '' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  newEvent.type === 'personal'
                    ? 'border-lime-400 bg-lime-50 text-lime-700'
                    : 'border-slate-200 text-slate-600 hover:border-lime-300'
                }`}
              >
                <User className="w-4 h-4" />
                개인
              </button>
              <button
                type="button"
                onClick={() => onEventChange({ ...newEvent, type: 'team' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  newEvent.type === 'team'
                    ? 'border-lime-400 bg-lime-50 text-lime-700'
                    : 'border-slate-200 text-slate-600 hover:border-lime-300'
                }`}
              >
                <Users className="w-4 h-4" />
                팀
              </button>
            </div>
          </div>

          {/* Project Selection (Team only) */}
          {newEvent.type === 'team' && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">프로젝트</Label>
              <select
                value={newEvent.projectId}
                onChange={(e) => onEventChange({ ...newEvent, projectId: e.target.value })}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="">프로젝트 선택...</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date/Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="allDay"
                checked={newEvent.isAllDay}
                onChange={(e) => onEventChange({ ...newEvent, isAllDay: e.target.checked })}
                className="rounded border-slate-300 text-lime-500 focus:ring-lime-400"
              />
              <Label htmlFor="allDay" className="text-sm text-slate-700">종일</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">시작</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newEvent.startDate}
                  onChange={(e) => onEventChange({ ...newEvent, startDate: e.target.value })}
                  className="rounded-xl h-11 flex-1"
                />
                {!newEvent.isAllDay && (
                  <Input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => onEventChange({ ...newEvent, startTime: e.target.value })}
                    className="rounded-xl h-11 w-32"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">종료</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => onEventChange({ ...newEvent, endDate: e.target.value })}
                  className="rounded-xl h-11 flex-1"
                />
                {!newEvent.isAllDay && (
                  <Input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => onEventChange({ ...newEvent, endTime: e.target.value })}
                    className="rounded-xl h-11 w-32"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">장소</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 rounded-xl h-11"
                value={newEvent.location}
                onChange={(e) => onEventChange({ ...newEvent, location: e.target.value })}
                placeholder="장소 추가"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">색상</Label>
            <div className="flex gap-2">
              {CALENDAR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-xl border-2 transition-all duration-200 hover:scale-110 ${
                    newEvent.color === color
                      ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-200'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onEventChange({ ...newEvent, color })}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">취소</Button>
          <Button variant="limePrimary" onClick={onSave} className="rounded-xl">저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EventModal
