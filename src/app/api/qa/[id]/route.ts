// =============================================================================
// QA Issue API - Get, Update, Delete Individual Issue
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, qaIssueUpdateSchema, validationErrorResponse } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/qa/[id] - Get issue details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    const issue = await prisma.qAIssue.findUnique({
      where: { id },
      include: {
        workspace: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        history: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        attachments: {
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!issue) {
      return createErrorResponse('Issue not found', 404, 'QA_NOT_FOUND')
    }

    // Increment view count
    await prisma.qAIssue.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json(issue)
  } catch (error) {
    secureLogger.error('Failed to get QA issue', error as Error, { operation: 'qa.get' })
    return createErrorResponse('Failed to get issue', 500, 'QA_GET_FAILED')
  }
}

// PATCH /api/qa/[id] - Update issue
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    // Get existing issue
    const existing = await prisma.qAIssue.findUnique({
      where: { id },
    })

    if (!existing) {
      return createErrorResponse('Issue not found', 404, 'QA_NOT_FOUND')
    }

    const validation = await validateBody(request, qaIssueUpdateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const data = validation.data!
    const { checklist, ...updateData } = data

    // Track changes for history
    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = []

    // Check what changed
    if (data.status && data.status !== existing.status) {
      changes.push({
        field: 'status',
        oldValue: existing.status,
        newValue: data.status,
      })

      // Set resolved/closed timestamps
      if (data.status === 'RESOLVED' && !existing.resolvedAt) {
        (updateData as any).resolvedAt = new Date()
      }
      if (data.status === 'CLOSED' && !existing.closedAt) {
        (updateData as any).closedAt = new Date()
      }
      if (data.status === 'REOPENED') {
        // Reset timestamps when reopening - use undefined for Prisma null assignment
        Object.assign(updateData, { resolvedAt: null as Date | null, closedAt: null as Date | null })
      }
    }

    if (data.priority && data.priority !== existing.priority) {
      changes.push({
        field: 'priority',
        oldValue: existing.priority,
        newValue: data.priority,
      })
    }

    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
      changes.push({
        field: 'assignee',
        oldValue: existing.assigneeId,
        newValue: data.assigneeId || null,
      })
    }

    if (data.title && data.title !== existing.title) {
      changes.push({
        field: 'title',
        oldValue: existing.title,
        newValue: data.title,
      })
    }

    // Update issue
    const issue = await prisma.qAIssue.update({
      where: { id },
      data: {
        ...updateData,
        checklist: checklist
          ? checklist.map(item => ({
              ...item,
              completedAt: item.completed ? new Date().toISOString() : null,
              completedBy: item.completed ? user.id : null,
            }))
          : undefined,
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    // Create history entries for all changes
    if (changes.length > 0) {
      await prisma.qAIssueHistory.createMany({
        data: changes.map(change => ({
          issueId: id,
          userId: user.id,
          action: `${change.field}_changed`,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        })),
      })
    }

    // Sync changes to GitHub if connected
    if (existing.syncedToGitHub && existing.githubIssueNumber) {
      await syncUpdateToGitHub(issue)
    }

    secureLogger.info('QA issue updated', {
      operation: 'qa.update',
      userId: user.id,
      issueId: id,
      changes: changes.map(c => c.field),
    })

    return NextResponse.json(issue)
  } catch (error) {
    secureLogger.error('Failed to update QA issue', error as Error, { operation: 'qa.update' })
    return createErrorResponse('Failed to update issue', 500, 'QA_UPDATE_FAILED')
  }
}

// DELETE /api/qa/[id] - Delete issue
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    const existing = await prisma.qAIssue.findUnique({
      where: { id },
    })

    if (!existing) {
      return createErrorResponse('Issue not found', 404, 'QA_NOT_FOUND')
    }

    // Only reporter or admin can delete
    // TODO: Add role check for admin

    await prisma.qAIssue.delete({
      where: { id },
    })

    secureLogger.info('QA issue deleted', {
      operation: 'qa.delete',
      userId: user.id,
      issueId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Failed to delete QA issue', error as Error, { operation: 'qa.delete' })
    return createErrorResponse('Failed to delete issue', 500, 'QA_DELETE_FAILED')
  }
}

// Helper function to sync update to GitHub
async function syncUpdateToGitHub(issue: any) {
  try {
    if (!issue.githubRepoOwner || !issue.githubRepoName || !issue.githubIssueNumber) {
      return
    }

    const integration = await prisma.gitHubIntegration.findUnique({
      where: { workspaceId: issue.workspaceId },
    })

    if (!integration) return

    // Map status to GitHub state
    const state = ['CLOSED', 'RESOLVED'].includes(issue.status) ? 'closed' : 'open'

    await fetch(
      `https://api.github.com/repos/${issue.githubRepoOwner}/${issue.githubRepoName}/issues/${issue.githubIssueNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[${issue.type}] ${issue.title}`,
          state,
        }),
      }
    )
  } catch (error) {
    secureLogger.error('Failed to sync update to GitHub', error as Error, {
      operation: 'qa.github_sync_update',
    })
  }
}
