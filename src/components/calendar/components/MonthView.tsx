'use client'

import React from 'react'
import { format, isSameMonth, isSameDay, isToday } from 'date-fns'
import { CalendarEvent } from '../types'

interface MonthViewProps {
  calendarDays: Date[]
  currentDate: Date
  selectedDate: Date | null
  getEventsForDay: (day: Date) => CalendarEvent[]
  onDateSelect: (date: Date) => void
  onDateDoubleClick: (date: Date) => void
}

export function MonthView({
  calendarDays,
  currentDate,
  selectedDate,
  getEventsForDay,
  onDateSelect,
  onDateDoubleClick
}: MonthViewProps) {
  return (
    <div className="h-full grid grid-cols-7 grid-rows-[auto_1fr_1fr_1fr_1fr_1fr_1fr]">
      {/* Weekday Headers */}
      {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
        <div
          key={day}
          className={`p-3 text-center text-sm font-semibold border-b border-r border-white/30 ${
            i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'
          }`}
        >
          {day}
        </div>
      ))}

      {/* Days */}
      {calendarDays.map((day) => {
        const dayEvents = getEventsForDay(day)
        const isSelected = selectedDate && isSameDay(day, selectedDate)

        return (
          <div
            key={day.toISOString()}
            className={`h-[120px] p-2 border-b border-r border-white/30 relative cursor-pointer transition-all duration-200 hover:bg-lime-50/50 overflow-hidden ${
              !isSameMonth(day, currentDate) ? 'bg-slate-50/50 text-slate-400' : 'bg-transparent'
            } ${isSelected ? 'ring-2 ring-lime-400 ring-inset bg-lime-50/70' : ''}`}
            onClick={() => onDateSelect(day)}
            onDoubleClick={() => onDateDoubleClick(day)}
          >
            <span className={`text-sm font-medium inline-block w-7 h-7 text-center leading-7 rounded-xl transition-all duration-200 ${
              isToday(day)
                ? 'bg-black text-lime-400 font-bold'
                : 'hover:bg-lime-100'
            }`}>
              {format(day, 'd')}
            </span>

            {/* Events */}
            <div className="mt-1 space-y-1 overflow-hidden">
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  className="text-xs px-2 py-0.5 rounded-lg truncate cursor-pointer hover:shadow-md transition-all duration-200 text-white font-medium"
                  style={{ backgroundColor: event.color }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDateSelect(day)
                  }}
                >
                  {event.isAllDay ? '' : format(new Date(event.startDate), 'HH:mm ')}
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-slate-500 px-2 font-medium">
                  +{dayEvents.length - 2}개 더보기
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MonthView
