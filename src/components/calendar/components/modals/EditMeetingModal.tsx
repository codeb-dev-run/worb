'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Video, MapPin, Trash2 } from 'lucide-react'
import { EditingMeeting } from '../../types'

interface EditMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  meeting: EditingMeeting | null
  onMeetingChange: (meeting: EditingMeeting) => void
  onSave: () => void
  onDelete: () => void
}

export function EditMeetingModal({
  isOpen,
  onClose,
  meeting,
  onMeetingChange,
  onSave,
  onDelete
}: EditMeetingModalProps) {
  if (!meeting) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-violet-500" />
            미팅 수정
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">미팅 제목</Label>
            <Input
              value={meeting.title}
              onChange={(e) => onMeetingChange({ ...meeting, title: e.target.value })}
              placeholder="미팅 제목을 입력하세요"
              className="rounded-xl h-11"
            />
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">미팅 유형</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onMeetingChange({ ...meeting, meetingType: 'online' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  meeting.meetingType === 'online'
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-600 hover:border-violet-300'
                }`}
              >
                <Video className="w-4 h-4" />
                온라인
              </button>
              <button
                type="button"
                onClick={() => onMeetingChange({ ...meeting, meetingType: 'offline' })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  meeting.meetingType === 'offline'
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-600 hover:border-violet-300'
                }`}
              >
                <MapPin className="w-4 h-4" />
                오프라인
              </button>
            </div>
          </div>

          {/* Location (Offline only) */}
          {meeting.meetingType === 'offline' && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">장소</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 rounded-xl h-11"
                  value={meeting.location}
                  onChange={(e) => onMeetingChange({ ...meeting, location: e.target.value })}
                  placeholder="미팅 장소"
                />
              </div>
            </div>
          )}

          {/* Date/Time */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">날짜 및 시간</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={meeting.date}
                onChange={(e) => onMeetingChange({ ...meeting, date: e.target.value })}
                className="rounded-xl h-11 flex-1 min-w-0"
              />
              <Input
                type="time"
                value={meeting.startTime}
                onChange={(e) => onMeetingChange({ ...meeting, startTime: e.target.value })}
                className="rounded-xl h-11 w-[120px] shrink-0"
              />
              <span className="text-slate-400 shrink-0">~</span>
              <Input
                type="time"
                value={meeting.endTime}
                onChange={(e) => onMeetingChange({ ...meeting, endTime: e.target.value })}
                className="rounded-xl h-11 w-[120px] shrink-0"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">설명</Label>
            <textarea
              value={meeting.description}
              onChange={(e) => onMeetingChange({ ...meeting, description: e.target.value })}
              placeholder="미팅 목적이나 안건을 입력하세요..."
              className="w-full h-24 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
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
            <Button onClick={onSave} className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white">저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditMeetingModal
