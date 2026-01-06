// =============================================================================
// QA Issue API - List & Create Issues
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, validateQuery, qaIssueCreateSchema, qaIssueSearchSchema, validationErrorResponse } from '@/lib/validation'
import { Prisma } from '@prisma/client'

// GET /api/qa - List QA issues
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const validation = validateQuery(searchParams, qaIssueSearchSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const {
      workspaceId,
      projectId,
      status,
      type,
      priority,
      assigneeId,
      reporterId,
      search,
      labels,
      page,
      limit,
      sortBy,
      sortOrder,
    } = validation.data!

    // Build where clause
    const where: Prisma.QAIssueWhereInput = {
      workspaceId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(type && { type }),
      ...(priority && { priority }),
      ...(assigneeId && { assigneeId }),
      ...(reporterId && { reporterId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(labels && {
        labels: { hasSome: labels.split(',').map(l => l.trim()) },
      }),
    }

    // Get total count
    const total = await prisma.qAIssue.count({ where })

    // Get issues with pagination
    const issues = await prisma.qAIssue.findMany({
      where,
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
        _count: {
          select: { comments: true, attachments: true },
        },
      },
      orderBy: {
        [sortBy || 'createdAt']: sortOrder || 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      issues,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    secureLogger.error('Failed to list QA issues', error as Error, { operation: 'qa.list' })
    return createErrorResponse('Failed to list issues', 500, 'QA_LIST_FAILED')
  }
}

// POST /api/qa - Create a new QA issue
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const validation = await validateBody(request, qaIssueCreateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const data = validation.data!
    const {
      syncToGitHub,
      githubRepoOwner,
      githubRepoName,
      checklist,
      ...issueData
    } = data

    // Create issue
    const issue = await prisma.qAIssue.create({
      data: {
        ...issueData,
        reporterId: user.id,
        checklist: checklist ? checklist.map(item => ({
          ...item,
          completedAt: null,
          completedBy: null,
        })) : undefined,
        labels: issueData.labels || [],
        affectedFiles: issueData.affectedFiles || [],
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

    // Create history entry
    await prisma.qAIssueHistory.create({
      data: {
        issueId: issue.id,
        userId: user.id,
        action: 'created',
        newValue: issue.title,
      },
    })

    // Sync to GitHub if requested
    if (syncToGitHub) {
      // This will be handled by a separate function/API
      // For now, we just mark it for sync
      await syncIssueToGitHub(issue.id, issue.workspaceId, githubRepoOwner, githubRepoName)
    }

    secureLogger.info('QA issue created', {
      operation: 'qa.create',
      userId: user.id,
      issueId: issue.id,
    })

    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to create QA issue', error as Error, { operation: 'qa.create' })
    return createErrorResponse('Failed to create issue', 500, 'QA_CREATE_FAILED')
  }
}

// Helper function to sync issue to GitHub
async function syncIssueToGitHub(
  issueId: string,
  workspaceId: string,
  repoOwner?: string,
  repoName?: string
) {
  try {
    // Get GitHub integration settings
    const integration = await prisma.gitHubIntegration.findUnique({
      where: { workspaceId },
    })

    if (!integration || !integration.autoSyncEnabled) {
      return null
    }

    const owner = repoOwner || integration.defaultRepoOwner
    const repo = repoName || integration.defaultRepoName

    if (!owner || !repo) {
      return null
    }

    // Get issue details
    const issue = await prisma.qAIssue.findUnique({
      where: { id: issueId },
      include: {
        reporter: { select: { name: true, email: true } },
      },
    })

    if (!issue) return null

    // Build GitHub issue body
    const body = buildGitHubIssueBody(issue)

    // Create GitHub issue via API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[${issue.type}] ${issue.title}`,
        body,
        labels: buildGitHubLabels(issue, integration.labelMapping as Record<string, Record<string, string>> | null),
      }),
    })

    if (response.ok) {
      const ghIssue = await response.json()

      // Update issue with GitHub info
      await prisma.qAIssue.update({
        where: { id: issueId },
        data: {
          githubIssueUrl: ghIssue.html_url,
          githubIssueNumber: ghIssue.number,
          githubRepoOwner: owner,
          githubRepoName: repo,
          syncedToGitHub: true,
        },
      })

      // Create history entry
      await prisma.qAIssueHistory.create({
        data: {
          issueId,
          userId: issue.reporterId,
          action: 'synced_to_github',
          newValue: ghIssue.html_url,
          syncedToGitHub: true,
        },
      })

      return ghIssue
    }

    return null
  } catch (error) {
    secureLogger.error('Failed to sync to GitHub', error as Error, {
      operation: 'qa.github_sync',
      issueId,
    })
    return null
  }
}

function buildGitHubIssueBody(issue: any): string {
  let body = `## Description\n${issue.description}\n\n`

  if (issue.type === 'BUG') {
    if (issue.stepsToReproduce) {
      body += `## Steps to Reproduce\n${issue.stepsToReproduce}\n\n`
    }
    if (issue.expectedBehavior) {
      body += `## Expected Behavior\n${issue.expectedBehavior}\n\n`
    }
    if (issue.actualBehavior) {
      body += `## Actual Behavior\n${issue.actualBehavior}\n\n`
    }
  }

  if (issue.environment) {
    body += `## Environment\n${issue.environment}\n\n`
  }

  if (issue.affectedFiles && issue.affectedFiles.length > 0) {
    body += `## Affected Files\n${issue.affectedFiles.map((f: string) => `- \`${f}\``).join('\n')}\n\n`
  }

  body += `---\n*Created from QA Board by ${issue.reporter?.name || 'Unknown'}*`

  return body
}

function buildGitHubLabels(
  issue: any,
  labelMapping: Record<string, Record<string, string>> | null
): string[] {
  const labels: string[] = []

  // Map type
  const typeLabels: Record<string, string> = {
    BUG: 'bug',
    FEATURE: 'enhancement',
    IMPROVEMENT: 'improvement',
    TASK: 'task',
    QUESTION: 'question',
  }

  // Map priority
  const priorityLabels: Record<string, string> = {
    LOW: 'priority: low',
    MEDIUM: 'priority: medium',
    HIGH: 'priority: high',
    CRITICAL: 'priority: critical',
  }

  // Use custom mapping if available, otherwise use defaults
  if (labelMapping?.type?.[issue.type]) {
    labels.push(labelMapping.type[issue.type])
  } else if (typeLabels[issue.type]) {
    labels.push(typeLabels[issue.type])
  }

  if (labelMapping?.priority?.[issue.priority]) {
    labels.push(labelMapping.priority[issue.priority])
  } else if (priorityLabels[issue.priority]) {
    labels.push(priorityLabels[issue.priority])
  }

  // Add custom labels
  if (issue.labels && issue.labels.length > 0) {
    labels.push(...issue.labels)
  }

  return labels
}
