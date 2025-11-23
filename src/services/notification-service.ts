import { getDatabase, ref, push, set, onValue, off, update, query, orderByChild, limitToLast } from 'firebase/database'
import { app } from '@/lib/firebase'
import { NotificationData } from '@/types/services'
import logger from '@/utils/logger'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  time: string
  read: boolean
  userId: string
  projectId?: string
  link?: string
}

class NotificationService {
  private db = getDatabase(app)

  // 알림 생성
  async createNotification(notification: Omit<Notification, 'id' | 'time' | 'read'>) {
    try {
      const notificationRef = ref(this.db, `notifications/${notification.userId}`)
      const newNotificationRef = push(notificationRef)

      await set(newNotificationRef, {
        ...notification,
        time: new Date().toISOString(),
        read: false
      })

      return newNotificationRef.key
    } catch (error) {
      logger.error('Error creating notification', 'NotificationService', error)
      throw error
    }
  }

  // 프로젝트 알림 생성 (팀 전체)
  async createProjectNotification(
    projectId: string,
    teamMembers: string[],
    notification: Omit<Notification, 'id' | 'time' | 'read' | 'userId' | 'projectId'>
  ) {
    try {
      const promises = teamMembers.map(userId =>
        this.createNotification({
          ...notification,
          userId,
          projectId
        })
      )

      await Promise.all(promises)
    } catch (error) {
      logger.error('Error creating project notifications', 'NotificationService', error)
      throw error
    }
  }

  // 알림 읽음 처리
  async markAsRead(userId: string, notificationId: string) {
    try {
      const notificationRef = ref(this.db, `notifications/${userId}/${notificationId}`)
      await update(notificationRef, { read: true })
    } catch (error) {
      logger.error('Error marking notification as read', 'NotificationService', error)
      throw error
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(userId: string) {
    try {
      const notificationsRef = ref(this.db, `notifications/${userId}`)
      const snapshot = await new Promise<any>((resolve) => {
        onValue(notificationsRef, resolve, { onlyOnce: true })
      })

      if (snapshot.exists()) {
        const updates: any = {}
        Object.keys(snapshot.val()).forEach(key => {
          updates[`notifications/${userId}/${key}/read`] = true
        })
        await update(ref(this.db), updates)
      }
    } catch (error) {
      logger.error('Error marking all notifications as read', 'NotificationService', error)
      throw error
    }
  }

  // 알림 구독
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const notificationsRef = query(
      ref(this.db, `notifications/${userId}`),
      orderByChild('time'),
      limitToLast(50)
    )

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const notifications: Notification[] = []

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          notifications.push({
            id: child.key!,
            ...child.val()
          })
        })
      }

      // 최신순으로 정렬
      notifications.sort((a, b) =>
        new Date(b.time).getTime() - new Date(a.time).getTime()
      )

      callback(notifications)
    })

    return () => off(notificationsRef)
  }

  // 시스템 알림 생성 헬퍼
  async createSystemNotifications(type: string, data: NotificationData) {
    switch (type) {
      case 'task_assigned':
        if (data.assigneeId) {
          await this.createNotification({
            userId: data.assigneeId,
            type: 'info',
            title: '새 작업 할당',
            message: `"${data.taskTitle}" 작업이 할당되었습니다.`,
            projectId: data.projectId,
            link: `/projects/${data.projectId}?tab=kanban`
          })
        }
        break

      case 'task_completed':
        if (data.teamMembers && data.projectId) {
          await this.createProjectNotification(
            data.projectId,
            data.teamMembers,
            {
              type: 'success',
              title: '작업 완료',
              message: `${data.userName}님이 "${data.taskTitle}" 작업을 완료했습니다.`,
              link: `/projects/${data.projectId}?tab=kanban`
            }
          )
        }
        break

      case 'project_deadline':
        if (data.projectId && data.teamMembers) {
          await this.createProjectNotification(
            data.projectId,
            data.teamMembers,
            {
              type: 'warning',
              title: '프로젝트 마감 임박',
              message: `${data.projectName} 프로젝트가 ${data.daysLeft}일 후 마감됩니다.`,
              link: `/projects/${data.projectId}`
            }
          )
        }
        break

      case 'file_uploaded':
        if (data.projectId && data.teamMembers) {
          await this.createProjectNotification(
            data.projectId,
            data.teamMembers,
            {
              type: 'info',
              title: '새 파일 업로드',
              message: `${data.userName}님이 "${data.fileName}" 파일을 업로드했습니다.`,
              link: `/files?project=${data.projectId}`
            }
          )
        }
        break

      case 'marketing_lead':
        if (data.userId) {
          await this.createNotification({
            userId: data.userId,
            type: 'success',
            title: '새 리드 등록',
            message: `${data.leadName} 고객이 ${data.stage} 단계로 등록되었습니다.`,
            link: '/marketing'
          })
        }
        break
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService