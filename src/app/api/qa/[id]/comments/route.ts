// =============================================================================
// QA Issue Comments API
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, qaIssueCommentSchema, validationErrorResponse } from '@/lib/validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/qa/[id]/comments - Get issue comments
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    const comments = await prisma.qAIssueComment.findMany({
      where: { issueId: id },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    secureLogger.error('Failed to get comments', error as Error, { operation: 'qa.comments.list' })
    return createErrorResponse('Failed to get comments', 500, 'QA_COMMENTS_FAILED')
  }
}

// POST /api/qa/[id]/comments - Add a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { id } = await params

    // Check if issue exists
    const issue = await prisma.qAIssue.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
        syncedToGitHub: true,
        githubIssueNumber: true,
        githubRepoOwner: true,
        githubRepoName: true,
      },
    })

    if (!issue) {
      return createErrorResponse('Issue not found', 404, 'QA_NOT_FOUND')
    }

    const validation = await validateBody(request, qaIssueCommentSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const data = validation.data!

    const comment = await prisma.qAIssueComment.create({
      data: {
        issueId: id,
        authorId: user.id,
        content: data.content,
        filePath: data.filePath,
        lineNumber: data.lineNumber,
        codeSnippet: data.codeSnippet,
        isInternal: data.isInternal,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    })

    // Create history entry
    await prisma.qAIssueHistory.create({
      data: {
        issueId: id,
        userId: user.id,
        action: 'commented',
        newValue: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
      },
    })

    // Sync comment to GitHub if connected and not internal
    if (issue.syncedToGitHub && !data.isInternal && issue.githubIssueNumber) {
      await syncCommentToGitHub(issue, comment, user.name || user.email)
    }

    secureLogger.info('QA comment created', {
      operation: 'qa.comment.create',
      userId: user.id,
      issueId: id,
      commentId: comment.id,
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    secureLogger.error('Failed to create comment', error as Error, { operation: 'qa.comment.create' })
    return createErrorResponse('Failed to create comment', 500, 'QA_COMMENT_CREATE_FAILED')
  }
}

// Helper function to sync comment to GitHub
async function syncCommentToGitHub(
  issue: {
    workspaceId: string
    githubRepoOwner: string | null
    githubRepoName: string | null
    githubIssueNumber: number | null
  },
  comment: { content: string; filePath?: string | null; lineNumber?: number | null; codeSnippet?: string | null },
  authorName: string
) {
  try {
    if (!issue.githubRepoOwner || !issue.githubRepoName || !issue.githubIssueNumber) {
      return
    }

    const integration = await prisma.gitHubIntegration.findUnique({
      where: { workspaceId: issue.workspaceId },
    })

    if (!integration || !integration.syncComments) return

    // Build comment body
    let body = comment.content

    // Add code reference if present
    if (comment.filePath) {
      body = `**File:** \`${comment.filePath}\`${comment.lineNumber ? ` (Line ${comment.lineNumber})` : ''}\n\n`
      if (comment.codeSnippet) {
        body += `\`\`\`\n${comment.codeSnippet}\n\`\`\`\n\n`
      }
      body += comment.content
    }

    body += `\n\n---\n*Comment by ${authorName} via QA Board*`

    await fetch(
      `https://api.github.com/repos/${issue.githubRepoOwner}/${issue.githubRepoName}/issues/${issue.githubIssueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    )
  } catch (error) {
    secureLogger.error('Failed to sync comment to GitHub', error as Error, {
      operation: 'qa.github_sync_comment',
    })
  }
}
