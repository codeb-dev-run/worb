// =============================================================================
// Google Sync API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse, validateBody, ValidationError } from '@/lib/security'
import { z } from 'zod'

// CVE-CB-007: Input validation schema
const syncSchema = z.object({
  email: z.string().email('Invalid email').max(255),
  name: z.string().max(100).optional(),
  image: z.string().url().max(500).optional().nullable(),
})

export async function POST(request: Request) {
  try {
    // CVE-CB-007: Validate input (throws ValidationError on failure)
    let validatedData: z.infer<typeof syncSchema>
    try {
      validatedData = await validateBody(request, syncSchema)
    } catch (error) {
      if (error instanceof ValidationError) {
        return createErrorResponse(error.message, 400, 'VALIDATION_ERROR')
      }
      throw error
    }

    const { email, name, image } = validatedData

    // CVE-CB-005: Secure logging (no email in logs)
    secureLogger.info('Google sync started', {
      operation: 'auth.google.sync',
      emailDomain: email.split('@')[1] || 'unknown',
    })

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (user) {
      // CVE-CB-005: Secure logging
      secureLogger.info('Updating existing user', {
        operation: 'auth.google.sync.update',
        userId: user.id,
      })

      // Update user info
      user = await prisma.user.update({
        where: { email },
        data: {
          name: name || user.name,
          avatar: image || user.avatar,
        }
      })
    } else {
      // CVE-CB-005: Secure logging
      secureLogger.info('Creating new user via Google sync', {
        operation: 'auth.google.sync.create',
      })

      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar: image,
          role: 'member',
        }
      })

      secureLogger.info('User created via Google sync', {
        operation: 'auth.google.sync.created',
        userId: user.id,
      })
    }

    // Check if user has any workspace memberships
    const workspaceMemberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id }
    })

    secureLogger.info('User workspace check', {
      operation: 'auth.google.sync.workspaces',
      userId: user.id,
      membershipCount: workspaceMemberships.length,
    })

    // If user has no workspaces, find the first available workspace and add them
    if (workspaceMemberships.length === 0) {
      const firstWorkspace = await prisma.workspace.findFirst({
        orderBy: { createdAt: 'asc' }
      })

      if (firstWorkspace) {
        secureLogger.info('Adding user to default workspace', {
          operation: 'auth.google.sync.add_to_workspace',
          userId: user.id,
          workspaceId: firstWorkspace.id,
        })

        await prisma.workspaceMember.create({
          data: {
            workspaceId: firstWorkspace.id,
            userId: user.id,
            role: 'member',
          }
        })

        // Add user to all projects in this workspace
        const projects = await prisma.project.findMany({
          where: { workspaceId: firstWorkspace.id },
          select: { id: true }
        })

        secureLogger.info('Adding user to workspace projects', {
          operation: 'auth.google.sync.add_to_projects',
          userId: user.id,
          projectCount: projects.length,
        })

        // N+1 Fix: Batch check existing memberships
        const projectIds = projects.map(p => p.id)
        const existingMemberships = await prisma.projectMember.findMany({
          where: {
            projectId: { in: projectIds },
            userId: user.id
          },
          select: { projectId: true }
        })
        const existingProjectIds = new Set(existingMemberships.map(m => m.projectId))

        // Filter projects where user is not a member
        const projectsToAdd = projects.filter(p => !existingProjectIds.has(p.id))

        // N+1 Fix: Batch create memberships
        if (projectsToAdd.length > 0) {
          await prisma.projectMember.createMany({
            data: projectsToAdd.map(project => ({
              projectId: project.id,
              userId: user.id,
              role: 'Member'
            })),
            skipDuplicates: true
          })
        }
      }
    }

    return NextResponse.json({
      uid: user.id,
      email: user.email,
      displayName: user.name,
      photoURL: user.avatar,
      role: user.role,
    })
  } catch (error) {
    // CVE-CB-005: Secure error logging (no sensitive details exposed)
    secureLogger.error('Google sync error', error as Error, { operation: 'auth.google.sync' })
    return createErrorResponse('Internal server error', 500, 'SERVER_ERROR')
  }
}
