'use client'

// ===========================================
// Glass Morphism Calendar View (Refactored)
// 1428줄 → ~250줄 (타입/훅/컴포넌트 분리)
// ===========================================

import React, { useState, useCallback, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays
} from 'date-fns'

// Types
import {
  CalendarEvent,
  ViewMode,
  FilterMode,
  NewEventForm,
  NewMeetingForm,
  EditingMeeting,
  INITIAL_EVENT_FORM,
  INITIAL_MEETING_FORM
} from './types'

// Hooks
import { useCalendarData } from './hooks'

// Components
import {
  CalendarHeader,
  MonthView,
  WeekView,
  DayView,
  Sidebar,
  EventModal,
  MeetingModal,
  EditEventModal,
  EditMeetingModal
} from './components'

export default function CalendarView() {
  // UI State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMeetingEditModalOpen, setIsMeetingEditModalOpen] = useState(false)

  // Form State
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    ...INITIAL_EVENT_FORM,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [newMeeting, setNewMeeting] = useState<NewMeetingForm>({
    ...INITIAL_MEETING_FORM,
    date: format(new Date(), 'yyyy-MM-dd')
  })
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<EditingMeeting | null>(null)

  // Data Hook
  const {
    filteredEvents,
    projects,
    handleCreateEvent,
    handleCreateMeeting,
    handleUpdateEvent,
    handleDeleteEvent,
    handleUpdateMeeting,
    handleDeleteMeeting,
    getEventsForDay,
    getSidebarEvents,
    isMeetingEvent,
    parseMeetingFromEvent
  } = useCalendarData(currentDate, viewMode, filterMode)

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    let start: Date, end: Date

    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(monthStart)
      start = startOfWeek(monthStart)
      end = endOfWeek(monthEnd)
    } else if (viewMode === 'week') {
      start = startOfWeek(currentDate)
      end = endOfWeek(currentDate)
    } else {
      start = startOfDay(currentDate)
      end = endOfDay(currentDate)
    }

    return eachDayOfInterval({ start, end })
  }, [currentDate, viewMode])

  // Navigation handlers
  const handleNavigatePrev = useCallback(() => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subDays(currentDate, 1))
  }, [currentDate, viewMode])

  const handleNavigateNext = useCallback(() => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 1))
  }, [currentDate, viewMode])

  const handleGoToToday = useCallback(() => setCurrentDate(new Date()), [])

  // Modal handlers
  const handleOpenCreateModal = useCallback((date?: Date) => {
    const targetDate = date || new Date()
    setNewEvent({
      ...INITIAL_EVENT_FORM,
      startDate: format(targetDate, 'yyyy-MM-dd'),
      endDate: format(targetDate, 'yyyy-MM-dd')
    })
    setIsCreateModalOpen(true)
  }, [])

  const handleOpenEditModal = useCallback((event: CalendarEvent) => {
    if (isMeetingEvent(event)) {
      const parsed = parseMeetingFromEvent(event)
      if (parsed) {
        setEditingMeeting(parsed)
        setIsMeetingEditModalOpen(true)
      }
    } else {
      setEditingEvent(event)
      setIsEditModalOpen(true)
    }
  }, [isMeetingEvent, parseMeetingFromEvent])

  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    setNewEvent(prev => ({
      ...prev,
      startDate: format(date, 'yyyy-MM-dd'),
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endDate: format(date, 'yyyy-MM-dd'),
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
    }))
    setIsCreateModalOpen(true)
  }, [])

  const handleDayTimeSlotClick = useCallback((hour: number) => {
    setNewEvent(prev => ({
      ...prev,
      startDate: format(currentDate, 'yyyy-MM-dd'),
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endDate: format(currentDate, 'yyyy-MM-dd'),
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
    }))
    setIsCreateModalOpen(true)
  }, [currentDate])

  // Event save handlers
  const handleSaveEvent = useCallback(async () => {
    const success = await handleCreateEvent(newEvent)
    if (success) {
      setIsCreateModalOpen(false)
      setNewEvent({
        ...INITIAL_EVENT_FORM,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
      })
    }
  }, [newEvent, handleCreateEvent])

  const handleSaveMeeting = useCallback(async () => {
    const success = await handleCreateMeeting(newMeeting)
    if (success) {
      setIsMeetingModalOpen(false)
      setNewMeeting({
        ...INITIAL_MEETING_FORM,
        date: format(new Date(), 'yyyy-MM-dd')
      })
    }
  }, [newMeeting, handleCreateMeeting])

  const handleUpdateEventSave = useCallback(async () => {
    if (!editingEvent) return
    const success = await handleUpdateEvent(editingEvent)
    if (success) {
      setIsEditModalOpen(false)
      setEditingEvent(null)
    }
  }, [editingEvent, handleUpdateEvent])

  const handleDeleteEventConfirm = useCallback(async () => {
    if (!editingEvent) return
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return
    const success = await handleDeleteEvent(editingEvent.id)
    if (success) {
      setIsEditModalOpen(false)
      setEditingEvent(null)
    }
  }, [editingEvent, handleDeleteEvent])

  const handleUpdateMeetingSave = useCallback(async () => {
    if (!editingMeeting) return
    const success = await handleUpdateMeeting(editingMeeting)
    if (success) {
      setIsMeetingEditModalOpen(false)
      setEditingMeeting(null)
    }
  }, [editingMeeting, handleUpdateMeeting])

  const handleDeleteMeetingConfirm = useCallback(async () => {
    if (!editingMeeting) return
    if (!confirm('정말 이 미팅을 삭제하시겠습니까?')) return
    const success = await handleDeleteMeeting(editingMeeting.id)
    if (success) {
      setIsMeetingEditModalOpen(false)
      setEditingMeeting(null)
    }
  }, [editingMeeting, handleDeleteMeeting])

  // Sidebar events
  const sidebarEvents = useMemo(
    () => getSidebarEvents(selectedDate, viewMode),
    [getSidebarEvents, selectedDate, viewMode]
  )

  return (
    <div className="h-full flex gap-6">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg shadow-black/5 border border-white/40 overflow-hidden">
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          filterMode={filterMode}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          onGoToToday={handleGoToToday}
          onViewModeChange={setViewMode}
          onFilterModeChange={setFilterMode}
          onOpenCreateModal={() => handleOpenCreateModal()}
          onOpenMeetingModal={() => setIsMeetingModalOpen(true)}
        />

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'month' && (
            <MonthView
              calendarDays={calendarDays}
              currentDate={currentDate}
              selectedDate={selectedDate}
              getEventsForDay={getEventsForDay}
              onDateSelect={setSelectedDate}
              onDateDoubleClick={handleOpenCreateModal}
            />
          )}

          {viewMode === 'week' && (
            <WeekView
              calendarDays={calendarDays}
              getEventsForDay={getEventsForDay}
              onTimeSlotClick={handleTimeSlotClick}
            />
          )}

          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              filteredEvents={filteredEvents}
              onTimeSlotClick={handleDayTimeSlotClick}
            />
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <Sidebar
        events={sidebarEvents}
        currentDate={currentDate}
        selectedDate={selectedDate}
        viewMode={viewMode}
        onAddEvent={handleOpenCreateModal}
        onEditEvent={handleOpenEditModal}
      />

      {/* Modals */}
      <EventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        newEvent={newEvent}
        projects={projects}
        onEventChange={setNewEvent}
        onSave={handleSaveEvent}
      />

      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        meeting={newMeeting}
        projects={projects}
        onMeetingChange={setNewMeeting}
        onSave={handleSaveMeeting}
      />

      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingEvent(null) }}
        event={editingEvent}
        onEventChange={setEditingEvent}
        onSave={handleUpdateEventSave}
        onDelete={handleDeleteEventConfirm}
      />

      <EditMeetingModal
        isOpen={isMeetingEditModalOpen}
        onClose={() => { setIsMeetingEditModalOpen(false); setEditingMeeting(null) }}
        meeting={editingMeeting}
        onMeetingChange={setEditingMeeting}
        onSave={handleUpdateMeetingSave}
        onDelete={handleDeleteMeetingConfirm}
      />
    </div>
  )
}
