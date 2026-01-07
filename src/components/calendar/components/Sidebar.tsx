'use client'

import React from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarEvent, ViewMode } from '../types'

interface SidebarProps {
  events: CalendarEvent[]
  currentDate: Date
  selectedDate: Date | null
  viewMode: ViewMode
  onAddEvent: (date: Date) => void
  onEditEvent: (event: CalendarEvent) => void
}

export function Sidebar({
  events,
  currentDate,
  selectedDate,
  viewMode,
  onAddEvent,
  onEditEvent
}: SidebarProps) {
  return (
    <div className="w-80 shrink-0 bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg shadow-black/5 border border-white/40 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/40">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-lime-500" />
          {viewMode === 'month'
            ? `${format(currentDate, 'M월', { locale: ko })} 전체 일정`
            : selectedDate
              ? format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
              : '오늘'
          }
          {viewMode !== 'month' && ' 일정'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {events.length}개의 일정
          {viewMode === 'month' && <span className="ml-2 text-lime-600">(더블클릭하여 수정)</span>}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">일정이 없습니다</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddEvent(selectedDate || new Date())}
              className="mt-2 text-lime-600 hover:text-lime-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              일정 추가하기
            </Button>
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              className="p-3 rounded-2xl bg-white/80 border border-white/60 hover:shadow-md hover:border-lime-300 transition-all cursor-pointer group"
              onDoubleClick={() => onEditEvent(event)}
              title="더블클릭하여 수정"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-900 truncate">{event.title}</h4>
                    <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* 월 보기일 때 날짜도 표시 */}
                  {viewMode === 'month' && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-lime-600 font-medium">
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(event.startDate), 'M월 d일 (EEE)', { locale: ko })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {event.isAllDay
                      ? '종일'
                      : `${format(new Date(event.startDate), 'HH:mm')} - ${format(new Date(event.endDate), 'HH:mm')}`
                    }
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="w-3 h-3 text-slate-400" />
                      <div className="flex -space-x-2">
                        {event.attendees.slice(0, 3).map((attendee, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600"
                          >
                            {attendee.user?.name?.[0] || '?'}
                          </div>
                        ))}
                        {event.attendees.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                            +{event.attendees.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Sidebar
