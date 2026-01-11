// ===========================================
// Calendar Types
// ===========================================

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurrenceRule {
  type: RecurrenceType
  interval: number // every N days/weeks/months/years
  endDate?: string // 반복 종료일
  endCount?: number // 반복 횟수
  weekDays?: number[] // 주간 반복 시 요일 (0=일, 1=월, ..., 6=토)
}

export interface CalendarEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  color: string
  isAllDay: boolean
  location?: string
  description?: string
  type?: 'personal' | 'team' | 'meeting'
  projectId?: string
  attendees?: CalendarAttendee[]
  creator?: {
    name: string
    avatar: string
  }
  recurrence?: RecurrenceRule
  recurringEventId?: string // 반복 이벤트의 원본 ID (수정/삭제 시 사용)
}

export interface CalendarAttendee {
  user?: {
    name?: string
  }
}

export type ViewMode = 'day' | 'week' | 'month'
export type FilterMode = 'all' | 'personal' | 'team'

export interface NewEventForm {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  description: string
  color: string
  isAllDay: boolean
  type: 'personal' | 'team' | 'meeting'
  projectId: string
  recurrenceType: RecurrenceType
  recurrenceInterval: number
  recurrenceEndDate: string
}

export interface NewMeetingForm {
  title: string
  date: string
  startTime: string
  endTime: string
  projectId: string
  description: string
  meetingType: 'online' | 'offline'
  location: string
}

export interface EditingMeeting {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  description: string
  meetingType: 'online' | 'offline'
  location: string
}

export interface ProjectOption {
  id: string
  name: string
}

// Default values
export const INITIAL_EVENT_FORM: NewEventForm = {
  title: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  location: '',
  description: '',
  color: '#a3e635',
  isAllDay: false,
  type: 'personal',
  projectId: '',
  recurrenceType: 'none',
  recurrenceInterval: 1,
  recurrenceEndDate: ''
}

export const INITIAL_MEETING_FORM: NewMeetingForm = {
  title: '',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  projectId: '',
  description: '',
  meetingType: 'online',
  location: ''
}

export const CALENDAR_COLORS = ['#a3e635', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']
