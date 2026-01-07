'use client'

import React from 'react'
import { format, isSameDay, isToday, getHours } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarEvent } from '../types'

interface DayViewProps {
  currentDate: Date
  filteredEvents: CalendarEvent[]
  onTimeSlotClick: (hour: number) => void
}

export function DayView({
  currentDate,
  filteredEvents,
  onTimeSlotClick
}: DayViewProps) {
  return (
    <div className="h-full grid grid-cols-1">
      <div className="p-4 border-b border-white/30 text-center">
        <div className={`text-lg font-bold ${isToday(currentDate) ? 'text-lime-600' : 'text-slate-700'}`}>
          {format(currentDate, 'M월 d일 EEEE', { locale: ko })}
        </div>
      </div>
      <div className="overflow-auto">
        {Array.from({ length: 24 }, (_, i) => {
          const hourEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.startDate)
            return isSameDay(eventDate, currentDate) && getHours(eventDate) === i
          })

          return (
            <div
              key={i}
              className="flex border-b border-white/20 min-h-[60px] hover:bg-lime-50/30 cursor-pointer"
              onClick={() => onTimeSlotClick(i)}
            >
              <div className="w-20 p-2 text-sm text-slate-400 text-right pr-4 border-r border-white/30 shrink-0">
                {i.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-2 space-y-1">
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className="px-3 py-2 rounded-xl text-sm text-white font-medium cursor-pointer hover:shadow-lg transition-all"
                    style={{ backgroundColor: event.color }}
                  >
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-xs opacity-80">
                      {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DayView
