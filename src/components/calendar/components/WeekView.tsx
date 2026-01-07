'use client'

import React from 'react'
import { format, isToday, getHours, setHours } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarEvent, NewEventForm } from '../types'

interface WeekViewProps {
  calendarDays: Date[]
  getEventsForDay: (day: Date) => CalendarEvent[]
  onTimeSlotClick: (date: Date, hour: number) => void
}

export function WeekView({
  calendarDays,
  getEventsForDay,
  onTimeSlotClick
}: WeekViewProps) {
  return (
    <div className="h-full grid grid-cols-8">
      {/* Time Column */}
      <div className="border-r border-white/30">
        <div className="h-12 border-b border-white/30"></div>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="h-12 px-2 text-xs text-slate-400 text-right pr-2 border-b border-white/20">
            {i.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Day Columns */}
      {calendarDays.slice(0, 7).map((day, dayIndex) => {
        const dayEvents = getEventsForDay(day)

        return (
          <div key={day.toISOString()} className="border-r border-white/30">
            <div className={`h-12 p-2 text-center border-b border-white/30 ${
              dayIndex === 0 ? 'text-rose-500' : dayIndex === 6 ? 'text-blue-500' : 'text-slate-600'
            }`}>
              <div className="text-xs font-medium">{format(day, 'EEE', { locale: ko })}</div>
              <div className={`text-sm font-bold ${isToday(day) ? 'w-6 h-6 bg-black text-lime-400 rounded-full mx-auto flex items-center justify-center' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
            <div className="relative">
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className="h-12 border-b border-white/20 hover:bg-lime-50/30 cursor-pointer"
                  onClick={() => onTimeSlotClick(day, i)}
                />
              ))}
              {/* Render events */}
              {dayEvents.map(event => {
                const startHour = getHours(new Date(event.startDate))
                const endHour = getHours(new Date(event.endDate)) || startHour + 1
                const duration = Math.max(endHour - startHour, 1)

                return (
                  <div
                    key={event.id}
                    className="absolute left-0 right-1 mx-1 px-2 py-1 rounded-lg text-xs text-white font-medium overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    style={{
                      backgroundColor: event.color,
                      top: `${startHour * 48}px`,
                      height: `${duration * 48 - 4}px`
                    }}
                  >
                    <div className="truncate">{event.title}</div>
                    {duration > 1 && (
                      <div className="text-[10px] opacity-80">
                        {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default WeekView
