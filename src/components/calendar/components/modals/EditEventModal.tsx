'use client'

import React from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit3, MapPin, Trash2 } from 'lucide-react'
import { CalendarEvent, CALENDAR_COLORS } from '../../types'

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onEventChange: (event: CalendarEvent) => void
  onSave: () => void
  onDelete: () => void
}

export function EditEventModal({
  isOpen,
  onClose,
  event,
  onEventChange,
  onSave,
  onDelete
}: EditEventModalProps) {
  if (!event) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-lime-500" />
            일정 수정
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">제목</Label>
            <Input
              value={event.title}
              onChange={(e) => onEventChange({ ...event, title: e.target.value })}
              placeholder="일정 제목"
              className="rounded-xl h-11"
            />
          </div>

          {/* Date/Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="editAllDay"
                checked={event.isAllDay}
                onChange={(e) => onEventChange({ ...event, isAllDay: e.target.checked })}
                className="rounded border-slate-300 text-lime-500 focus:ring-lime-400"
              />
              <Label htmlFor="editAllDay" className="text-sm text-slate-700">종일</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">시작</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={format(new Date(event.startDate), "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => onEventChange({ ...event, startDate: new Date(e.target.value).toISOString() })}
                  className="rounded-xl h-11 flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">종료</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={format(new Date(event.endDate), "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => onEventChange({ ...event, endDate: new Date(e.target.value).toISOString() })}
                  className="rounded-xl h-11 flex-1"
                />
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
                value={event.location || ''}
                onChange={(e) => onEventChange({ ...event, location: e.target.value })}
                placeholder="장소 추가"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">설명</Label>
            <textarea
              value={event.description || ''}
              onChange={(e) => onEventChange({ ...event, description: e.target.value })}
              placeholder="설명 추가..."
              className="w-full h-20 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
            />
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
                    event.color === color
                      ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-200'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onEventChange({ ...event, color })}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between shrink-0">
          <Button
            variant="ghost"
            onClick={onDelete}
            className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-xl">취소</Button>
            <Button variant="limePrimary" onClick={onSave} className="rounded-xl">저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditEventModal
