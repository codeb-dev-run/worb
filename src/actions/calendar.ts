'use server'

// =============================================================================
// Calendar Server Actions - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { secureLogger } from '@/lib/security'

export async function getCalendarEvents(workspaceId: string, startDate: Date, endDate: Date) {
    try {
        const events = await prisma.calendarEvent.findMany({
            where: {
                workspaceId,
                startDate: {
                    gte: startDate,
                },
                endDate: {
                    lte: endDate,
                },
            },
            include: {
                creator: {
                    select: {
                        name: true,
                        avatar: true,
                    },
                },
                attendees: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                startDate: 'asc',
            },
        })

        return events.map(event => ({
            ...event,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate.toISOString(),
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
        }))
    } catch (error) {
        secureLogger.error('Error fetching calendar events', error as Error, { operation: 'calendar.list' })
        return []
    }
}

export async function createCalendarEvent(data: {
    workspaceId: string
    title: string
    description?: string
    startDate: Date
    endDate: Date
    location?: string
    color?: string
    isAllDay?: boolean
    createdBy: string
}) {
    try {
        const event = await prisma.calendarEvent.create({
            data: {
                ...data,
                attendees: {
                    create: {
                        userId: data.createdBy,
                        status: 'accepted',
                    },
                },
            },
        })

        revalidatePath('/calendar')
        return { success: true, event }
    } catch (error) {
        secureLogger.error('Error creating calendar event', error as Error, { operation: 'calendar.create' })
        return { success: false, error }
    }
}

export async function updateCalendarEvent(
    eventId: string,
    data: {
        title?: string
        description?: string
        startDate?: Date
        endDate?: Date
        location?: string
        color?: string
        isAllDay?: boolean
    }
) {
    try {
        const event = await prisma.calendarEvent.update({
            where: { id: eventId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        })

        revalidatePath('/calendar')
        return { success: true, event }
    } catch (error) {
        secureLogger.error('Error updating calendar event', error as Error, { operation: 'calendar.update' })
        return { success: false, error }
    }
}

export async function deleteCalendarEvent(eventId: string) {
    try {
        // 먼저 attendees 삭제
        await prisma.calendarEventAttendee.deleteMany({
            where: { eventId },
        })

        // 이벤트 삭제
        await prisma.calendarEvent.delete({
            where: { id: eventId },
        })

        revalidatePath('/calendar')
        return { success: true }
    } catch (error) {
        secureLogger.error('Error deleting calendar event', error as Error, { operation: 'calendar.delete' })
        return { success: false, error }
    }
}

// =============================================================================
// HR 이벤트 (휴가, 생일) 조회 - 캘린더 통합용
// =============================================================================

export interface HRCalendarEvent {
    id: string
    title: string
    description?: string
    startDate: string
    endDate: string
    color: string
    isAllDay: boolean
    type: 'leave' | 'birthday'
    employeeName: string
    employeeId?: string
}

export async function getHRCalendarEvents(
    workspaceId: string,
    startDate: Date,
    endDate: Date
): Promise<HRCalendarEvent[]> {
    try {
        const events: HRCalendarEvent[] = []

        // 1. 승인된 휴가 조회
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: {
                workspaceId,
                status: 'APPROVED',
                OR: [
                    {
                        startDate: { gte: startDate, lte: endDate }
                    },
                    {
                        endDate: { gte: startDate, lte: endDate }
                    },
                    {
                        AND: [
                            { startDate: { lte: startDate } },
                            { endDate: { gte: endDate } }
                        ]
                    }
                ]
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        nameKor: true,
                        department: true
                    }
                }
            }
        })

        // 휴가 이벤트 변환
        for (const leave of leaveRequests) {
            const leaveTypeLabel = getLeaveTypeLabel(leave.type)
            events.push({
                id: `leave-${leave.id}`,
                title: `🏖️ ${leave.employee.nameKor} ${leaveTypeLabel}`,
                description: leave.reason || `${leave.employee.department || ''} ${leave.employee.nameKor}님의 ${leaveTypeLabel}`,
                startDate: leave.startDate.toISOString(),
                endDate: leave.endDate.toISOString(),
                color: '#9333EA', // 보라색
                isAllDay: true,
                type: 'leave',
                employeeName: leave.employee.nameKor,
                employeeId: leave.employee.id
            })
        }

        // 2. 생일 조회 (해당 기간 내 생일인 직원)
        const employees = await prisma.employee.findMany({
            where: {
                workspaceId,
                birthDate: { not: null },
                status: 'ACTIVE'
            },
            select: {
                id: true,
                nameKor: true,
                birthDate: true,
                department: true
            }
        })

        // 생일 이벤트 변환 (매년 반복되므로 해당 기간의 생일을 찾음)
        const startYear = startDate.getFullYear()
        const endYear = endDate.getFullYear()

        for (const emp of employees) {
            if (!emp.birthDate) continue

            // 시작년도와 끝년도에 대해 생일 체크
            for (let year = startYear; year <= endYear; year++) {
                const birthdayThisYear = new Date(
                    year,
                    emp.birthDate.getMonth(),
                    emp.birthDate.getDate()
                )

                // 조회 기간 내에 생일이 있는지 확인
                if (birthdayThisYear >= startDate && birthdayThisYear <= endDate) {
                    events.push({
                        id: `birthday-${emp.id}-${year}`,
                        title: `🎂 ${emp.nameKor} 생일`,
                        description: `${emp.department || ''} ${emp.nameKor}님의 생일입니다! 🎉`,
                        startDate: birthdayThisYear.toISOString(),
                        endDate: birthdayThisYear.toISOString(),
                        color: '#F59E0B', // 주황색
                        isAllDay: true,
                        type: 'birthday',
                        employeeName: emp.nameKor,
                        employeeId: emp.id
                    })
                }
            }
        }

        return events.sort((a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
    } catch (error) {
        secureLogger.error('Error fetching HR calendar events', error as Error, { operation: 'calendar.hr' })
        return []
    }
}

function getLeaveTypeLabel(type: string): string {
    switch (type) {
        case 'ANNUAL': return '연차'
        case 'HALF_DAY_AM': return '오전 반차'
        case 'HALF_DAY_PM': return '오후 반차'
        case 'SICK': return '병가'
        case 'SPECIAL': return '특별휴가'
        case 'MATERNITY': return '출산휴가'
        case 'PATERNITY': return '육아휴직'
        case 'BEREAVEMENT': return '경조사 휴가'
        case 'UNPAID': return '무급휴가'
        default: return '휴가'
    }
}
