// =============================================================================
// GitHub Integration API for QA Board
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'
import { validateBody, githubIntegrationSchema, validationErrorResponse, uuidSchema } from '@/lib/validation'
import { z } from 'zod'

// GET /api/qa/github - Get GitHub integration settings
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'VALIDATION_ERROR')
    }

    const integration = await prisma.gitHubIntegration.findUnique({
      where: { workspaceId },
      select: {
        id: true,
        workspaceId: true,
        tokenType: true,
        defaultRepoOwner: true,
        defaultRepoName: true,
        autoSyncEnabled: true,
        syncLabels: true,
        syncAssignees: true,
        syncComments: true,
        labelMapping: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose accessToken
      },
    })

    if (!integration) {
      return NextResponse.json({ configured: false })
    }

    return NextResponse.json({
      configured: true,
      ...integration,
    })
  } catch (error) {
    secureLogger.error('Failed to get GitHub integration', error as Error, {
      operation: 'qa.github.get',
    })
    return createErrorResponse('Failed to get integration', 500, 'GITHUB_GET_FAILED')
  }
}

// POST /api/qa/github - Create/Update GitHub integration
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const validation = await validateBody(request, githubIntegrationSchema)
    if (!validation.success) {
      return validationErrorResponse(validation.errors!)
    }

    const data = validation.data!

    // Verify GitHub token is valid
    const isValid = await verifyGitHubToken(data.accessToken)
    if (!isValid) {
      return createErrorResponse('Invalid GitHub token', 400, 'INVALID_GITHUB_TOKEN')
    }

    // Upsert integration
    const integration = await prisma.gitHubIntegration.upsert({
      where: { workspaceId: data.workspaceId },
      update: {
        accessToken: data.accessToken,
        tokenType: data.tokenType,
        defaultRepoOwner: data.defaultRepoOwner,
        defaultRepoName: data.defaultRepoName,
        autoSyncEnabled: data.autoSyncEnabled,
        syncLabels: data.syncLabels,
        syncAssignees: data.syncAssignees,
        syncComments: data.syncComments,
        labelMapping: data.labelMapping,
      },
      create: {
        workspaceId: data.workspaceId,
        accessToken: data.accessToken,
        tokenType: data.tokenType,
        defaultRepoOwner: data.defaultRepoOwner,
        defaultRepoName: data.defaultRepoName,
        autoSyncEnabled: data.autoSyncEnabled,
        syncLabels: data.syncLabels,
        syncAssignees: data.syncAssignees,
        syncComments: data.syncComments,
        labelMapping: data.labelMapping,
      },
      select: {
        id: true,
        workspaceId: true,
        tokenType: true,
        defaultRepoOwner: true,
        defaultRepoName: true,
        autoSyncEnabled: true,
        syncLabels: true,
        syncAssignees: true,
        syncComments: true,
        labelMapping: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    secureLogger.info('GitHub integration configured', {
      operation: 'qa.github.configure',
      userId: user.id,
      workspaceId: data.workspaceId,
    })

    return NextResponse.json(integration)
  } catch (error) {
    secureLogger.error('Failed to configure GitHub integration', error as Error, {
      operation: 'qa.github.configure',
    })
    return createErrorResponse('Failed to configure integration', 500, 'GITHUB_CONFIG_FAILED')
  }
}

// DELETE /api/qa/github - Delete GitHub integration
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest()
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return createErrorResponse('workspaceId is required', 400, 'VALIDATION_ERROR')
    }

    await prisma.gitHubIntegration.delete({
      where: { workspaceId },
    })

    secureLogger.info('GitHub integration deleted', {
      operation: 'qa.github.delete',
      userId: user.id,
      workspaceId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Failed to delete GitHub integration', error as Error, {
      operation: 'qa.github.delete',
    })
    return createErrorResponse('Failed to delete integration', 500, 'GITHUB_DELETE_FAILED')
  }
}

// Helper to verify GitHub token
async function verifyGitHubToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })
    return response.ok
  } catch {
    return false
  }
}
