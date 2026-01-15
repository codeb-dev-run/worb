'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, isSameDay } from 'date-fns'
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getHRCalendarEvents, HRCalendarEvent } from '@/actions/calendar'
import { getProjects } from '@/actions/project'
import { useWorkspace } from '@/lib/workspace-context'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'react-hot-toast'
import {
  CalendarEvent,
  ViewMode,
  FilterMode,
  NewEventForm,
  NewMeetingForm,
  EditingMeeting,
  ProjectOption,
  INITIAL_EVENT_FORM,
  INITIAL_MEETING_FORM
} from '../types'

const isDev = process.env.NODE_ENV === 'development'

interface UseCalendarDataReturn {
  // Data
  events: CalendarEvent[]
  filteredEvents: CalendarEvent[]
  projects: ProjectOption[]
  loading: boolean

  // Actions
  loadData: () => Promise<void>
  handleCreateEvent: (newEvent: NewEventForm) => Promise<boolean>
  handleCreateMeeting: (newMeeting: NewMeetingForm) => Promise<boolean>
  handleUpdateEvent: (event: CalendarEvent) => Promise<boolean>
  handleDeleteEvent: (eventId: string) => Promise<boolean>
  handleUpdateMeeting: (meeting: EditingMeeting) => Promise<boolean>
  handleDeleteMeeting: (meetingId: string) => Promise<boolean>

  // Helpers
  getEventsForDay: (day: Date) => CalendarEvent[]
  getSidebarEvents: (selectedDate: Date | null, viewMode: ViewMode) => CalendarEvent[]
  isMeetingEvent: (event: CalendarEvent) => boolean
  parseMeetingFromEvent: (event: CalendarEvent) => EditingMeeting | null
}

export function useCalendarData(
  currentDate: Date,
  viewMode: ViewMode,
  filterMode: FilterMode
): UseCalendarDataReturn {
  const { currentWorkspace } = useWorkspace()
  const { userProfile } = useAuth()

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [hrEvents, setHREvents] = useState<HRCalendarEvent[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(false)

  // Get date range based on view mode
  const getDateRange = useCallback(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(monthStart)
      return { start: startOfWeek(monthStart), end: endOfWeek(monthEnd) }
    } else if (viewMode === 'week') {
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
    } else {
      return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
    }
  }, [currentDate, viewMode])

  // Load data
  const loadData = useCallback(async () => {
    if (!currentWorkspace || !userProfile) return

    setLoading(true)
    try {
      const { start, end } = getDateRange()
      const [fetchedEvents, fetchedProjects, fetchedHREvents] = await Promise.all([
        getCalendarEvents(currentWorkspace.id, start, end),
        getProjects(userProfile.uid, currentWorkspace.id),
        getHRCalendarEvents(currentWorkspace.id, start, end)
      ])
      setEvents(fetchedEvents as unknown as CalendarEvent[])
      setProjects(fetchedProjects as ProjectOption[])
      setHREvents(fetchedHREvents)
    } catch (error) {
      if (isDev) console.error('Failed to load data:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, userProfile, getDateRange])

  useEffect(() => {
    let cancelled = false

    const doLoad = async () => {
      if (cancelled) return
      await loadData()
    }

    doLoad()

    return () => {
      cancelled = true
    }
  }, [loadData])

  // Combine HR events with regular events
  const allEvents: CalendarEvent[] = [
    ...events,
    // HR 이벤트를 CalendarEvent 형식으로 변환
    ...hrEvents.map(hr => ({
      id: hr.id,
      title: hr.title,
      description: hr.description || '',
      startDate: hr.startDate,
      endDate: hr.endDate,
      color: hr.color,
      isAllDay: hr.isAllDay,
      type: hr.type === 'leave' ? 'team' : 'personal',
      location: '',
      projectId: undefined,
      createdBy: hr.employeeId || '',
      createdAt: hr.startDate,
      updatedAt: hr.startDate,
      // HR 이벤트 식별용 플래그
      isHREvent: true,
      hrEventType: hr.type
    } as CalendarEvent & { isHREvent?: boolean; hrEventType?: string }))
  ]

  // Filter events
  const filteredEvents = allEvents.filter(event => {
    if (filterMode === 'all') return true
    if (filterMode === 'personal') return event.type === 'personal' || !event.projectId
    if (filterMode === 'team') return event.type === 'team' || event.type === 'meeting' || event.projectId
    return true
  })

  // Get events for specific day
  const getEventsForDay = useCallback((day: Date) => {
    return filteredEvents.filter(event => isSameDay(new Date(event.startDate), day))
  }, [filteredEvents])

  // Get sidebar events
  const getSidebarEvents = useCallback((selectedDate: Date | null, mode: ViewMode) => {
    if (mode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      return filteredEvents
        .filter(event => {
          const eventDate = new Date(event.startDate)
          return eventDate >= monthStart && eventDate <= monthEnd
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    } else if (selectedDate) {
      return filteredEvents.filter(event => isSameDay(new Date(event.startDate), selectedDate))
    } else {
      return filteredEvents.filter(event => isSameDay(new Date(event.startDate), new Date()))
    }
  }, [currentDate, filteredEvents])

  // Check if event is meeting
  const isMeetingEvent = useCallback((event: CalendarEvent) => {
    return event.description?.includes('[미팅 신청]') || false
  }, [])

  // Parse meeting from event
  const parseMeetingFromEvent = useCallback((event: CalendarEvent): EditingMeeting | null => {
    if (!isMeetingEvent(event)) return null

    const descLines = event.description?.split('\n') || []
    const meetingDesc = descLines[0]?.replace('[미팅 신청] ', '') || ''
    const typeLine = descLines.find(line => line.startsWith('유형:'))
    const meetingType = typeLine?.includes('온라인') ? 'online' : 'offline'

    return {
      id: event.id,
      title: event.title.replace('📅 ', ''),
      date: format(new Date(event.startDate), 'yyyy-MM-dd'),
      startTime: format(new Date(event.startDate), 'HH:mm'),
      endTime: format(new Date(event.endDate), 'HH:mm'),
      description: meetingDesc,
      meetingType: meetingType as 'online' | 'offline',
      location: event.location || ''
    }
  }, [isMeetingEvent])

  // Create event
  const handleCreateEvent = useCallback(async (newEvent: NewEventForm): Promise<boolean> => {
    if (!currentWorkspace || !userProfile || !newEvent.title) return false

    try {
      const startDateTime = newEvent.isAllDay
        ? new Date(newEvent.startDate)
        : new Date(`${newEvent.startDate}T${newEvent.startTime}`)

      const endDateTime = newEvent.isAllDay
        ? new Date(newEvent.endDate)
        : new Date(`${newEvent.endDate}T${newEvent.endTime}`)

      const result = await createCalendarEvent({
        workspaceId: currentWorkspace.id,
        title: newEvent.title,
        description: newEvent.description,
        startDate: startDateTime,
        endDate: endDateTime,
        location: newEvent.location,
        color: newEvent.color,
        isAllDay: newEvent.isAllDay,
        createdBy: userProfile.uid
      })

      if (result.success) {
        toast.success('일정이 생성되었습니다.')
        await loadData()
        return true
      }
      throw new Error('Create failed')
    } catch (error) {
      if (isDev) console.error('Error creating event:', error)
      toast.error('일정 생성 실패')
      return false
    }
  }, [currentWorkspace, userProfile, loadData])

  // Create meeting
  const handleCreateMeeting = useCallback(async (newMeeting: NewMeetingForm): Promise<boolean> => {
    if (!currentWorkspace || !userProfile || !newMeeting.title || !newMeeting.projectId) {
      toast.error('제목과 프로젝트를 선택해주세요.')
      return false
    }

    try {
      const startDateTime = new Date(`${newMeeting.date}T${newMeeting.startTime}`)
      const endDateTime = new Date(`${newMeeting.date}T${newMeeting.endTime}`)

      const result = await createCalendarEvent({
        workspaceId: currentWorkspace.id,
        title: `📅 ${newMeeting.title}`,
        description: `[미팅 신청] ${newMeeting.description}\n\n유형: ${newMeeting.meetingType === 'online' ? '온라인' : '오프라인'}`,
        startDate: startDateTime,
        endDate: endDateTime,
        location: newMeeting.meetingType === 'online' ? '온라인 미팅' : newMeeting.location,
        color: '#8B5CF6',
        isAllDay: false,
        createdBy: userProfile.uid
      })

      if (result.success) {
        toast.success('미팅이 신청되었습니다. 팀원들에게 알림이 전송됩니다.')
        await loadData()
        return true
      }
      throw new Error('Create failed')
    } catch (error) {
      if (isDev) console.error('Error creating meeting:', error)
      toast.error('미팅 신청 실패')
      return false
    }
  }, [currentWorkspace, userProfile, loadData])

  // Update event
  const handleUpdateEvent = useCallback(async (event: CalendarEvent): Promise<boolean> => {
    try {
      const result = await updateCalendarEvent(event.id, {
        title: event.title,
        description: event.description,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        location: event.location,
        color: event.color,
        isAllDay: event.isAllDay,
      })

      if (result.success) {
        toast.success('일정이 수정되었습니다.')
        await loadData()
        return true
      }
      throw new Error('Update failed')
    } catch (error) {
      if (isDev) console.error('Error updating event:', error)
      toast.error('일정 수정 실패')
      return false
    }
  }, [loadData])

  // Delete event
  const handleDeleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      const result = await deleteCalendarEvent(eventId)

      if (result.success) {
        toast.success('일정이 삭제되었습니다.')
        await loadData()
        return true
      }
      throw new Error('Delete failed')
    } catch (error) {
      if (isDev) console.error('Error deleting event:', error)
      toast.error('일정 삭제 실패')
      return false
    }
  }, [loadData])

  // Update meeting
  const handleUpdateMeeting = useCallback(async (meeting: EditingMeeting): Promise<boolean> => {
    try {
      const startDateTime = new Date(`${meeting.date}T${meeting.startTime}`)
      const endDateTime = new Date(`${meeting.date}T${meeting.endTime}`)

      const result = await updateCalendarEvent(meeting.id, {
        title: `📅 ${meeting.title}`,
        description: `[미팅 신청] ${meeting.description}\n\n유형: ${meeting.meetingType === 'online' ? '온라인' : '오프라인'}`,
        startDate: startDateTime,
        endDate: endDateTime,
        location: meeting.meetingType === 'online' ? '온라인 미팅' : meeting.location,
      })

      if (result.success) {
        toast.success('미팅이 수정되었습니다.')
        await loadData()
        return true
      }
      throw new Error('Update failed')
    } catch (error) {
      if (isDev) console.error('Error updating meeting:', error)
      toast.error('미팅 수정 실패')
      return false
    }
  }, [loadData])

  // Delete meeting
  const handleDeleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      const result = await deleteCalendarEvent(meetingId)

      if (result.success) {
        toast.success('미팅이 삭제되었습니다.')
        await loadData()
        return true
      }
      throw new Error('Delete failed')
    } catch (error) {
      if (isDev) console.error('Error deleting meeting:', error)
      toast.error('미팅 삭제 실패')
      return false
    }
  }, [loadData])

  return {
    events,
    filteredEvents,
    projects,
    loading,
    loadData,
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
  }
}
