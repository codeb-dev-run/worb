// =============================================================================
// Admin Delete Test Data API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// DELETE /api/admin/delete-test-data
// 현재 워크스페이스의 모든 프로젝트, 데이터, 테스트 계정 삭제 (1회용)
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 관리자 권한 확인
    const adminMembership = user.workspaces.find(wm => wm.role === 'admin')
    if (!adminMembership) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 })
    }

    const workspaceId = adminMembership.workspaceId

    secureLogger.info('Starting test data deletion', {
      operation: 'admin.deleteTestData.start',
      workspaceId,
    })

    // 트랜잭션으로 삭제 (순서 중요: 의존성 있는 테이블부터)
    const result = await prisma.$transaction(async (tx) => {
      // 1. 작업 코멘트 삭제
      const deletedComments = await tx.taskComment.deleteMany({
        where: {
          task: {
            project: {
              workspaceId
            }
          }
        }
      })

      // 2. 작업 삭제
      const deletedTasks = await tx.task.deleteMany({
        where: {
          project: {
            workspaceId
          }
        }
      })

      // 3. 프로젝트 멤버 삭제
      const deletedProjectMembers = await tx.projectMember.deleteMany({
        where: {
          project: {
            workspaceId
          }
        }
      })

      // 4. 프로젝트 삭제
      const deletedProjects = await tx.project.deleteMany({
        where: {
          workspaceId
        }
      })

      // 5. 파일 삭제 (File 모델은 projectId 기반이므로 프로젝트를 통해 삭제)
      const deletedFiles = await tx.file.deleteMany({
        where: {
          project: {
            workspaceId
          }
        }
      })

      // 6. 공지사항 삭제
      const deletedAnnouncements = await tx.announcement.deleteMany({
        where: {
          workspaceId
        }
      })

      // 7. 게시글 삭제
      const deletedBoardPosts = await tx.board.deleteMany({
        where: {
          workspaceId
        }
      })

      // 8. 출근 기록 삭제
      const deletedAttendance = await tx.attendance.deleteMany({
        where: {
          workspaceId
        }
      })

      // 9. 급여 기록 삭제
      const deletedPayroll = await tx.payrollRecord.deleteMany({
        where: {
          employee: {
            workspaceId
          }
        }
      })

      // 11. 직원 정보 삭제 (현재 사용자 제외)
      const deletedEmployees = await tx.employee.deleteMany({
        where: {
          workspaceId,
          userId: {
            not: user.id
          }
        }
      })

      // 12. 워크스페이스 멤버 삭제 (현재 사용자 제외)
      const deletedWorkspaceMembers = await tx.workspaceMember.deleteMany({
        where: {
          workspaceId,
          userId: {
            not: user.id
          }
        }
      })

      // 13. 테스트 계정 삭제 (현재 워크스페이스 멤버였던 사용자 중 다른 워크스페이스 소속 없는 경우)
      // 먼저 삭제 대상 사용자 ID 수집
      const usersToDelete = await tx.user.findMany({
        where: {
          AND: [
            { id: { not: user.id } },  // 현재 사용자 제외
            {
              workspaces: {
                none: {}  // 더 이상 어떤 워크스페이스에도 속하지 않는 사용자
              }
            }
          ]
        },
        select: { id: true, email: true }
      })

      secureLogger.info('Users to delete identified', {
        operation: 'admin.deleteTestData.usersIdentified',
        count: usersToDelete.length,
      })

      // 고아 사용자 삭제 (어떤 워크스페이스에도 속하지 않는 사용자)
      const deletedUsers = await tx.user.deleteMany({
        where: {
          AND: [
            { id: { not: user.id } },
            {
              workspaces: {
                none: {}
              }
            }
          ]
        }
      })

      return {
        comments: deletedComments.count,
        tasks: deletedTasks.count,
        projectMembers: deletedProjectMembers.count,
        projects: deletedProjects.count,
        files: deletedFiles.count,
        announcements: deletedAnnouncements.count,
        boardPosts: deletedBoardPosts.count,
        attendance: deletedAttendance.count,
        payroll: deletedPayroll.count,
        employees: deletedEmployees.count,
        workspaceMembers: deletedWorkspaceMembers.count,
        users: deletedUsers.count,
      }
    })

    secureLogger.info('Test data deletion complete', {
      operation: 'admin.deleteTestData.complete',
      deletedCounts: result,
    })

    return NextResponse.json({
      success: true,
      deleted: result,
      message: '테스트 데이터 및 계정이 성공적으로 삭제되었습니다'
    })

  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to delete test data', error as Error, { operation: 'admin.deleteTestData' })
    return createErrorResponse('Failed to delete test data', 500, 'DELETE_FAILED')
  }
}
