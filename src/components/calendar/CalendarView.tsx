'use client'

import React, { useState, useEffect } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    startOfDay,
    endOfDay,
    eachDayOfInterval,
    eachHourOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    isToday,
    getHours,
    setHours
} from 'date-fns'
import { ko } from 'date-fns/locale'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MapPin,
    Users,
    User,
    Calendar as CalendarIcon,
    Video,
    X,
    Check,
    Trash2,
    Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/actions/calendar'
import { getProjects } from '@/actions/project'
import { useWorkspace } from '@/lib/workspace-context'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'react-hot-toast'

// ===========================================
// Enhanced Glass Morphism Calendar View
// ===========================================

interface CalendarEvent {
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
    attendees?: any[]
    creator?: {
        name: string
        avatar: string
    }
}

type ViewMode = 'day' | 'week' | 'month'
type FilterMode = 'all' | 'personal' | 'team'

export default function CalendarView() {
    const { currentWorkspace } = useWorkspace()
    const { userProfile } = useAuth()

    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<ViewMode>('month')
    const [filterMode, setFilterMode] = useState<FilterMode>('all')
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

    const [newEvent, setNewEvent] = useState({
        title: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endDate: format(new Date(), 'yyyy-MM-dd'),
        endTime: '10:00',
        location: '',
        description: '',
        color: '#a3e635',
        isAllDay: false,
        type: 'personal' as 'personal' | 'team' | 'meeting',
        projectId: ''
    })

    const [newMeeting, setNewMeeting] = useState({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        projectId: '',
        description: '',
        meetingType: 'online' as 'online' | 'offline',
        location: ''
    })

    // Calendar Grid Generation
    const getDateRange = () => {
        if (viewMode === 'month') {
            const monthStart = startOfMonth(currentDate)
            const monthEnd = endOfMonth(monthStart)
            return {
                start: startOfWeek(monthStart),
                end: endOfWeek(monthEnd)
            }
        } else if (viewMode === 'week') {
            return {
                start: startOfWeek(currentDate),
                end: endOfWeek(currentDate)
            }
        } else {
            return {
                start: startOfDay(currentDate),
                end: endOfDay(currentDate)
            }
        }
    }

    const { start: startDate, end: endDate } = getDateRange()
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    const loadData = async () => {
        if (!currentWorkspace || !userProfile) return

        setLoading(true)
        try {
            const [fetchedEvents, fetchedProjects] = await Promise.all([
                getCalendarEvents(currentWorkspace.id, startDate, endDate),
                getProjects(userProfile.uid, currentWorkspace.id)
            ])
            setEvents(fetchedEvents as unknown as CalendarEvent[])
            setProjects(fetchedProjects)
        } catch (error) {
            console.error('Failed to load data:', error)
            toast.error('데이터를 불러오는데 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [currentDate, viewMode, currentWorkspace, userProfile])

    // Filter events based on filter mode
    const filteredEvents = events.filter(event => {
        if (filterMode === 'all') return true
        if (filterMode === 'personal') return event.type === 'personal' || !event.projectId
        if (filterMode === 'team') return event.type === 'team' || event.type === 'meeting' || event.projectId
        return true
    })

    // Get events for a specific day
    const getEventsForDay = (day: Date) => {
        return filteredEvents.filter(event =>
            isSameDay(new Date(event.startDate), day)
        )
    }

    // Get events for sidebar based on view mode
    // 월 보기: 해당 월 전체 일정 / 주/일 보기: 선택된 날짜 또는 오늘
    const sidebarEvents = (() => {
        if (viewMode === 'month') {
            // 월 보기일 때는 해당 월의 전체 일정
            const monthStart = startOfMonth(currentDate)
            const monthEnd = endOfMonth(currentDate)
            return filteredEvents.filter(event => {
                const eventDate = new Date(event.startDate)
                return eventDate >= monthStart && eventDate <= monthEnd
            }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        } else if (selectedDate) {
            // 주/일 보기에서 날짜 선택시 해당 날짜 일정
            return filteredEvents.filter(event => isSameDay(new Date(event.startDate), selectedDate))
        } else {
            // 기본: 오늘 일정
            return filteredEvents.filter(event => isSameDay(new Date(event.startDate), new Date()))
        }
    })()

    const handleCreateEvent = async () => {
        if (!currentWorkspace || !userProfile || !newEvent.title) return

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
                setIsCreateModalOpen(false)
                loadData()
                resetEventForm()
            } else {
                throw new Error('Create failed')
            }
        } catch (error) {
            console.error('Error creating event:', error)
            toast.error('일정 생성 실패')
        }
    }

    const handleCreateMeeting = async () => {
        if (!currentWorkspace || !userProfile || !newMeeting.title || !newMeeting.projectId) {
            toast.error('제목과 프로젝트를 선택해주세요.')
            return
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
                setIsMeetingModalOpen(false)
                loadData()
                resetMeetingForm()
            } else {
                throw new Error('Create failed')
            }
        } catch (error) {
            console.error('Error creating meeting:', error)
            toast.error('미팅 신청 실패')
        }
    }

    const resetEventForm = () => {
        setNewEvent({
            title: '',
            startDate: format(new Date(), 'yyyy-MM-dd'),
            startTime: '09:00',
            endDate: format(new Date(), 'yyyy-MM-dd'),
            endTime: '10:00',
            location: '',
            description: '',
            color: '#a3e635',
            isAllDay: false,
            type: 'personal',
            projectId: ''
        })
    }

    const resetMeetingForm = () => {
        setNewMeeting({
            title: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: '09:00',
            endTime: '10:00',
            projectId: '',
            description: '',
            meetingType: 'online',
            location: ''
        })
    }

    // 일정 수정 모달 열기
    const openEditModal = (event: CalendarEvent) => {
        setEditingEvent(event)
        setIsEditModalOpen(true)
    }

    // 일정 수정 핸들러
    const handleUpdateEvent = async () => {
        if (!editingEvent) return

        try {
            const startDateTime = editingEvent.isAllDay
                ? new Date(editingEvent.startDate)
                : new Date(editingEvent.startDate)

            const endDateTime = editingEvent.isAllDay
                ? new Date(editingEvent.endDate)
                : new Date(editingEvent.endDate)

            const result = await updateCalendarEvent(editingEvent.id, {
                title: editingEvent.title,
                description: editingEvent.description,
                startDate: startDateTime,
                endDate: endDateTime,
                location: editingEvent.location,
                color: editingEvent.color,
                isAllDay: editingEvent.isAllDay,
            })

            if (result.success) {
                toast.success('일정이 수정되었습니다.')
                setIsEditModalOpen(false)
                setEditingEvent(null)
                loadData()
            } else {
                throw new Error('Update failed')
            }
        } catch (error) {
            console.error('Error updating event:', error)
            toast.error('일정 수정 실패')
        }
    }

    // 일정 삭제 핸들러
    const handleDeleteEvent = async () => {
        if (!editingEvent) return

        if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return

        try {
            const result = await deleteCalendarEvent(editingEvent.id)

            if (result.success) {
                toast.success('일정이 삭제되었습니다.')
                setIsEditModalOpen(false)
                setEditingEvent(null)
                loadData()
            } else {
                throw new Error('Delete failed')
            }
        } catch (error) {
            console.error('Error deleting event:', error)
            toast.error('일정 삭제 실패')
        }
    }

    // Navigation
    const navigatePrev = () => {
        if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
        else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
        else setCurrentDate(subDays(currentDate, 1))
    }

    const navigateNext = () => {
        if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
        else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
        else setCurrentDate(addDays(currentDate, 1))
    }

    const goToToday = () => setCurrentDate(new Date())

    const getHeaderTitle = () => {
        if (viewMode === 'month') return format(currentDate, 'yyyy년 M월', { locale: ko })
        if (viewMode === 'week') {
            const weekStart = startOfWeek(currentDate)
            const weekEnd = endOfWeek(currentDate)
            return `${format(weekStart, 'M월 d일', { locale: ko })} - ${format(weekEnd, 'M월 d일', { locale: ko })}`
        }
        return format(currentDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })
    }

    const openCreateModal = (date?: Date) => {
        if (date) {
            setNewEvent(prev => ({
                ...prev,
                startDate: format(date, 'yyyy-MM-dd'),
                endDate: format(date, 'yyyy-MM-dd')
            }))
        }
        setIsCreateModalOpen(true)
    }

    return (
        <div className="h-full flex gap-6">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg shadow-black/5 border border-white/40 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900">
                            {getHeaderTitle()}
                        </h2>
                        <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
                            <Button variant="ghost" size="icon" onClick={navigatePrev} className="rounded-lg hover:bg-lime-50">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={navigateNext} className="rounded-lg hover:bg-lime-50">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" onClick={goToToday} className="rounded-lg hover:bg-lime-50 text-sm">
                                오늘
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* View Mode Toggle */}
                        <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
                            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        viewMode === mode
                                            ? 'bg-lime-400 text-black shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
                                    }`}
                                >
                                    {mode === 'day' ? '일' : mode === 'week' ? '주' : '월'}
                                </button>
                            ))}
                        </div>

                        {/* Filter Toggle */}
                        <div className="flex bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-white/40">
                            <button
                                onClick={() => setFilterMode('all')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    filterMode === 'all'
                                        ? 'bg-lime-400 text-black shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
                                }`}
                            >
                                전체
                            </button>
                            <button
                                onClick={() => setFilterMode('personal')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    filterMode === 'personal'
                                        ? 'bg-lime-400 text-black shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
                                }`}
                            >
                                <User className="w-3 h-3" />
                                개인
                            </button>
                            <button
                                onClick={() => setFilterMode('team')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    filterMode === 'team'
                                        ? 'bg-lime-400 text-black shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-lime-50'
                                }`}
                            >
                                <Users className="w-3 h-3" />
                                팀
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setIsMeetingModalOpen(true)} className="rounded-xl">
                                <Video className="h-4 w-4 mr-2" />
                                미팅 신청
                            </Button>
                            <Button variant="limePrimary" onClick={() => openCreateModal()} className="rounded-xl">
                                <Plus className="h-4 w-4 mr-2" />
                                일정 추가
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto">
                    {viewMode === 'month' && (
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
                                        className={`min-h-[100px] p-2 border-b border-r border-white/30 relative cursor-pointer transition-all duration-200 hover:bg-lime-50/50 ${
                                            !isSameMonth(day, currentDate) ? 'bg-slate-50/50 text-slate-400' : 'bg-transparent'
                                        } ${isSelected ? 'ring-2 ring-lime-400 ring-inset bg-lime-50/70' : ''}`}
                                        onClick={() => {
                                            setSelectedDate(day)
                                        }}
                                        onDoubleClick={() => openCreateModal(day)}
                                    >
                                        <span className={`text-sm font-medium inline-block w-7 h-7 text-center leading-7 rounded-xl transition-all duration-200 ${
                                            isToday(day)
                                                ? 'bg-black text-lime-400 font-bold'
                                                : 'hover:bg-lime-100'
                                        }`}>
                                            {format(day, 'd')}
                                        </span>

                                        {/* Events */}
                                        <div className="mt-1 space-y-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <div
                                                    key={event.id}
                                                    className="text-xs px-2 py-1 rounded-lg truncate cursor-pointer hover:shadow-md transition-all duration-200 text-white font-medium"
                                                    style={{ backgroundColor: event.color }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedDate(day)
                                                    }}
                                                >
                                                    {event.isAllDay ? '' : format(new Date(event.startDate), 'HH:mm ')}
                                                    {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-xs text-slate-500 px-2">
                                                    +{dayEvents.length - 3}개 더보기
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {viewMode === 'week' && (
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
                            {calendarDays.slice(0, 7).map((day, i) => {
                                const dayEvents = getEventsForDay(day)

                                return (
                                    <div key={day.toISOString()} className="border-r border-white/30">
                                        <div className={`h-12 p-2 text-center border-b border-white/30 ${
                                            i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'
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
                                                    onClick={() => {
                                                        const date = setHours(day, i)
                                                        setNewEvent(prev => ({
                                                            ...prev,
                                                            startDate: format(date, 'yyyy-MM-dd'),
                                                            startTime: `${i.toString().padStart(2, '0')}:00`,
                                                            endDate: format(date, 'yyyy-MM-dd'),
                                                            endTime: `${(i + 1).toString().padStart(2, '0')}:00`
                                                        }))
                                                        setIsCreateModalOpen(true)
                                                    }}
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
                    )}

                    {viewMode === 'day' && (
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
                                            onClick={() => {
                                                setNewEvent(prev => ({
                                                    ...prev,
                                                    startDate: format(currentDate, 'yyyy-MM-dd'),
                                                    startTime: `${i.toString().padStart(2, '0')}:00`,
                                                    endDate: format(currentDate, 'yyyy-MM-dd'),
                                                    endTime: `${(i + 1).toString().padStart(2, '0')}:00`
                                                }))
                                                setIsCreateModalOpen(true)
                                            }}
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
                    )}
                </div>
            </div>

            {/* Right Sidebar - Event List */}
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
                        {sidebarEvents.length}개의 일정
                        {viewMode === 'month' && <span className="ml-2 text-lime-600">(더블클릭하여 수정)</span>}
                    </p>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-3">
                    {sidebarEvents.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <CalendarIcon className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm text-slate-400">일정이 없습니다</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCreateModal(selectedDate || new Date())}
                                className="mt-2 text-lime-600 hover:text-lime-700"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                일정 추가하기
                            </Button>
                        </div>
                    ) : (
                        sidebarEvents.map(event => (
                            <div
                                key={event.id}
                                className="p-3 rounded-2xl bg-white/80 border border-white/60 hover:shadow-md hover:border-lime-300 transition-all cursor-pointer group"
                                onDoubleClick={() => openEditModal(event)}
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

            {/* Create Event Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-xl font-bold text-slate-900">새 일정 만들기</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 overflow-y-auto flex-1">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">제목</Label>
                            <Input
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
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
                                    onClick={() => setNewEvent({ ...newEvent, type: 'personal', projectId: '' })}
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
                                    onClick={() => setNewEvent({ ...newEvent, type: 'team' })}
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
                                    onChange={(e) => setNewEvent({ ...newEvent, projectId: e.target.value })}
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
                                    onChange={(e) => setNewEvent({ ...newEvent, isAllDay: e.target.checked })}
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
                                        onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                                        className="rounded-xl h-11 flex-1"
                                    />
                                    {!newEvent.isAllDay && (
                                        <Input
                                            type="time"
                                            value={newEvent.startTime}
                                            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
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
                                        onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                                        className="rounded-xl h-11 flex-1"
                                    />
                                    {!newEvent.isAllDay && (
                                        <Input
                                            type="time"
                                            value={newEvent.endTime}
                                            onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
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
                                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                    placeholder="장소 추가"
                                />
                            </div>
                        </div>

                        {/* Color */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">색상</Label>
                            <div className="flex gap-2">
                                {['#a3e635', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        className={`w-8 h-8 rounded-xl border-2 transition-all duration-200 hover:scale-110 ${
                                            newEvent.color === color
                                                ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-200'
                                                : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewEvent({ ...newEvent, color })}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl">취소</Button>
                        <Button variant="limePrimary" onClick={handleCreateEvent} className="rounded-xl">저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Meeting Request Modal */}
            <Dialog open={isMeetingModalOpen} onOpenChange={setIsMeetingModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Video className="w-5 h-5 text-violet-500" />
                            미팅 신청
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 overflow-y-auto flex-1">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">미팅 제목</Label>
                            <Input
                                value={newMeeting.title}
                                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                placeholder="미팅 제목을 입력하세요"
                                className="rounded-xl h-11"
                            />
                        </div>

                        {/* Project Selection */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">프로젝트 (팀원에게 알림)</Label>
                            <select
                                value={newMeeting.projectId}
                                onChange={(e) => setNewMeeting({ ...newMeeting, projectId: e.target.value })}
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                            >
                                <option value="">프로젝트 선택...</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Meeting Type */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">미팅 유형</Label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewMeeting({ ...newMeeting, meetingType: 'online' })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                        newMeeting.meetingType === 'online'
                                            ? 'border-violet-400 bg-violet-50 text-violet-700'
                                            : 'border-slate-200 text-slate-600 hover:border-violet-300'
                                    }`}
                                >
                                    <Video className="w-4 h-4" />
                                    온라인
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewMeeting({ ...newMeeting, meetingType: 'offline' })}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                        newMeeting.meetingType === 'offline'
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
                        {newMeeting.meetingType === 'offline' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">장소</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        className="pl-9 rounded-xl h-11"
                                        value={newMeeting.location}
                                        onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                                        placeholder="미팅 장소"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Date/Time */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">날짜 및 시간</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={newMeeting.date}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                    className="rounded-xl h-11 flex-1"
                                />
                                <Input
                                    type="time"
                                    value={newMeeting.startTime}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                                    className="rounded-xl h-11 w-28"
                                />
                                <span className="flex items-center text-slate-400">~</span>
                                <Input
                                    type="time"
                                    value={newMeeting.endTime}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                                    className="rounded-xl h-11 w-28"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">설명 (선택)</Label>
                            <textarea
                                value={newMeeting.description}
                                onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                                placeholder="미팅 목적이나 안건을 입력하세요..."
                                className="w-full h-24 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button variant="ghost" onClick={() => setIsMeetingModalOpen(false)} className="rounded-xl">취소</Button>
                        <Button
                            onClick={handleCreateMeeting}
                            className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white"
                        >
                            미팅 신청
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Event Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 backdrop-blur-2xl border-white/40 rounded-3xl flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Edit3 className="w-5 h-5 text-lime-500" />
                            일정 수정
                        </DialogTitle>
                    </DialogHeader>
                    {editingEvent && (
                        <div className="space-y-4 py-4 overflow-y-auto flex-1">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">제목</Label>
                                <Input
                                    value={editingEvent.title}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
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
                                        checked={editingEvent.isAllDay}
                                        onChange={(e) => setEditingEvent({ ...editingEvent, isAllDay: e.target.checked })}
                                        className="rounded border-slate-300 text-lime-500 focus:ring-lime-400"
                                    />
                                    <Label htmlFor="editAllDay" className="text-sm text-slate-700">종일</Label>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">시작</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="datetime-local"
                                            value={format(new Date(editingEvent.startDate), "yyyy-MM-dd'T'HH:mm")}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, startDate: new Date(e.target.value).toISOString() })}
                                            className="rounded-xl h-11 flex-1"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">종료</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="datetime-local"
                                            value={format(new Date(editingEvent.endDate), "yyyy-MM-dd'T'HH:mm")}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, endDate: new Date(e.target.value).toISOString() })}
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
                                        value={editingEvent.location || ''}
                                        onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                        placeholder="장소 추가"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">설명</Label>
                                <textarea
                                    value={editingEvent.description || ''}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                    placeholder="설명 추가..."
                                    className="w-full h-20 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none"
                                />
                            </div>

                            {/* Color */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">색상</Label>
                                <div className="flex gap-2">
                                    {['#a3e635', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-8 h-8 rounded-xl border-2 transition-all duration-200 hover:scale-110 ${
                                                editingEvent.color === color
                                                    ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-200'
                                                    : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setEditingEvent({ ...editingEvent, color })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex justify-between shrink-0">
                        <Button
                            variant="ghost"
                            onClick={handleDeleteEvent}
                            className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => { setIsEditModalOpen(false); setEditingEvent(null) }} className="rounded-xl">취소</Button>
                            <Button variant="limePrimary" onClick={handleUpdateEvent} className="rounded-xl">저장</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
