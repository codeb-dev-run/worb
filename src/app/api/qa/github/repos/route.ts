// =============================================================================
// GitHub Repositories API - List user's repositories
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, secureLogger, createErrorResponse } from '@/lib/security'

// GET /api/qa/github/repos - Get user's GitHub repositories
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
    })

    if (!integration) {
      return createErrorResponse('GitHub integration not configured', 404, 'GITHUB_NOT_CONFIGURED')
    }

    // Fetch repositories from GitHub
    const repos = await fetchGitHubRepos(integration.accessToken)

    return NextResponse.json(repos)
  } catch (error) {
    secureLogger.error('Failed to fetch GitHub repos', error as Error, {
      operation: 'qa.github.repos',
    })
    return createErrorResponse('Failed to fetch repositories', 500, 'GITHUB_REPOS_FAILED')
  }
}

async function fetchGitHubRepos(token: string) {
  const repos: Array<{
    id: number
    name: string
    full_name: string
    owner: string
    private: boolean
    html_url: string
  }> = []

  let page = 1
  const perPage = 100

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) break

    const data = await response.json()
    if (data.length === 0) break

    repos.push(
      ...data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        html_url: repo.html_url,
      }))
    )

    if (data.length < perPage) break
    page++

    // Safety limit
    if (page > 10) break
  }

  return repos
}
