/**
 * Project Server Actions Tests
 * Tests for core project management functionality
 */

// Mock dependencies first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
    },
  }
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

jest.mock('@/lib/email', () => ({
  sendProjectInviteEmail: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('@/lib/security', () => ({
  secureLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123')
}))

// Mock next-auth
const mockGetServerSession = jest.fn()
jest.mock('next-auth/next', () => ({
  getServerSession: () => mockGetServerSession()
}))

jest.mock('@/lib/auth-options', () => ({
  authOptions: {}
}))

import { prisma } from '@/lib/prisma'
import { secureLogger } from '@/lib/security'

describe('Project Server Actions', () => {
  const mockUserId = 'user-123'
  const mockWorkspaceId = 'workspace-123'

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    status: 'ACTIVE',
    visibility: 'PRIVATE',
    priority: 'MEDIUM',
    progress: 0,
    ownerId: mockUserId,
    workspaceId: mockWorkspaceId,
    startDate: new Date(),
    endDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    members: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProjects', () => {
    it('should return projects for a user in a workspace', async () => {
      const { getProjects } = await import('../project')
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject])

      const result = await getProjects(mockUserId, mockWorkspaceId)

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: mockWorkspaceId }
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('name', 'Test Project')
    })

    it('should return empty array on error', async () => {
      const { getProjects } = await import('../project')
      ;(prisma.project.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await getProjects(mockUserId, mockWorkspaceId)

      expect(result).toEqual([])
    })
  })

  describe('getProject', () => {
    it('should return a single project by ID', async () => {
      const { getProject } = await import('../project')
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject)

      const result = await getProject('project-1')

      expect(prisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' }
        })
      )
      expect(result).toHaveProperty('name', 'Test Project')
    })

    it('should return null for non-existent project', async () => {
      const { getProject } = await import('../project')
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getProject('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createProject', () => {
    it('should create a new project', async () => {
      const { createProject } = await import('../project')
      const newProject = { ...mockProject, id: 'new-project' }
      ;(prisma.project.create as jest.Mock).mockResolvedValue(newProject)

      const result = await createProject({
        name: 'New Project',
        description: 'New Description',
        createdBy: mockUserId,
        workspaceId: mockWorkspaceId
      })

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
      expect(prisma.project.create).toHaveBeenCalled()
    })

    it('should handle creation errors', async () => {
      const { createProject } = await import('../project')
      ;(prisma.project.create as jest.Mock).mockRejectedValue(new Error('Creation failed'))

      const result = await createProject({
        name: 'Test',
        createdBy: mockUserId,
        workspaceId: mockWorkspaceId
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateProject', () => {
    it('should update an existing project', async () => {
      const { updateProject } = await import('../project')
      const updatedProject = { ...mockProject, name: 'Updated Name' }
      ;(prisma.project.update as jest.Mock).mockResolvedValue(updatedProject)

      const result = await updateProject('project-1', { name: 'Updated Name' })

      expect(result.success).toBe(true)
      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' }
        })
      )
    })

    it('should handle update errors', async () => {
      const { updateProject } = await import('../project')
      ;(prisma.project.update as jest.Mock).mockRejectedValue(new Error('Update failed'))

      const result = await updateProject('project-1', { name: 'Updated' })

      expect(result.success).toBe(false)
    })
  })

  describe('deleteProject', () => {
    it('should delete a project when user is owner', async () => {
      const { deleteProject } = await import('../project')

      // Mock authenticated session as project owner
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId }
      })

      // Mock project lookup - user is owner
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdBy: mockUserId
      })
      ;(prisma.project.delete as jest.Mock).mockResolvedValue(mockProject)

      const result = await deleteProject('project-1')

      expect(result.success).toBe(true)
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' }
      })
    })

    it('should return unauthorized when no session', async () => {
      const { deleteProject } = await import('../project')

      // Mock no session
      mockGetServerSession.mockResolvedValue(null)

      const result = await deleteProject('project-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(prisma.project.delete).not.toHaveBeenCalled()
    })

    it('should return not found when project does not exist', async () => {
      const { deleteProject } = await import('../project')

      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId }
      })

      // Mock project not found
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await deleteProject('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Project not found')
      expect(prisma.project.delete).not.toHaveBeenCalled()
    })

    it('should return permission denied when user is not owner', async () => {
      const { deleteProject } = await import('../project')

      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId }
      })

      // Mock project with different owner
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdBy: 'different-user-id'
      })

      const result = await deleteProject('project-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
      expect(prisma.project.delete).not.toHaveBeenCalled()
      expect(secureLogger.warn).toHaveBeenCalledWith(
        'Unauthorized project deletion attempt',
        expect.objectContaining({
          projectId: 'project-1',
          attemptedBy: mockUserId,
          createdBy: 'different-user-id'
        })
      )
    })

    it('should handle deletion errors', async () => {
      const { deleteProject } = await import('../project')

      // Mock authenticated session as owner
      mockGetServerSession.mockResolvedValue({
        user: { id: mockUserId }
      })

      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        createdBy: mockUserId
      })
      ;(prisma.project.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'))

      const result = await deleteProject('project-1')

      expect(result.success).toBe(false)
    })
  })
})
