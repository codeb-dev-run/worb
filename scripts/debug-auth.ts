
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugAuth() {
    const user = {
        email: 'test-debug@example.com',
        name: 'Test Debug User',
        image: 'https://example.com/avatar.png',
    }

    console.log('[Debug] Starting auth simulation for:', user.email)

    try {
        // 1. Check if user exists
        console.log('[Debug] Checking if user exists...')
        let dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (dbUser) {
            console.log('[Debug] User exists:', dbUser.id)
            // Update user info
            console.log('[Debug] Updating user...')
            dbUser = await prisma.user.update({
                where: { email: user.email },
                data: {
                    name: user.name || dbUser.name,
                    avatar: user.image || dbUser.avatar,
                }
            })
            console.log('[Debug] User updated successfully')
        } else {
            console.log('[Debug] Creating new user...')
            // Create new user
            dbUser = await prisma.user.create({
                data: {
                    email: user.email,
                    name: user.name || user.email.split('@')[0],
                    avatar: user.image,
                    role: 'member',
                }
            })
            console.log('[Debug] User created:', dbUser.id)
        }

        // 2. Add user to first workspace (Simulate logic from auth.ts)
        console.log('[Debug] Checking user workspace membership...')
        const userWorkspaces = await prisma.workspaceMember.findFirst({
            where: { userId: dbUser.id }
        })

        if (!userWorkspaces) {
            console.log('[Debug] User has no workspace, proceeding to add...')
            console.log('[Debug] Finding first workspace...')
            let firstWorkspace = await prisma.workspace.findFirst({
                orderBy: { createdAt: 'asc' }
            })

            if (!firstWorkspace) {
                console.log('[Debug] No workspace found, creating default workspace...')
                firstWorkspace = await prisma.workspace.create({
                    data: {
                        name: 'Default Workspace',
                        slug: 'default-workspace',
                        inviteCode: 'DEFAULT',
                    }
                })
            }

            if (firstWorkspace) {
                console.log('[Debug] Found workspace:', firstWorkspace.id, firstWorkspace.name)

                console.log('[Debug] Adding user to workspace...')
                await prisma.workspaceMember.create({
                    data: {
                        workspaceId: firstWorkspace.id,
                        userId: dbUser.id,
                        role: 'member',
                    }
                })
                console.log('[Debug] User added to workspace')

                // 3. Add user to all projects in this workspace
                console.log('[Debug] Finding projects...')
                const projects = await prisma.project.findMany({
                    where: { workspaceId: firstWorkspace.id }
                })

                console.log('[Debug] Found', projects.length, 'projects')
                for (const project of projects) {
                    console.log('[Debug] Checking project member for project:', project.id)
                    const existingMember = await prisma.projectMember.findUnique({
                        where: {
                            projectId_userId: {
                                projectId: project.id,
                                userId: dbUser.id
                            }
                        }
                    })

                    if (!existingMember) {
                        console.log('[Debug] Adding to project:', project.id)
                        await prisma.projectMember.create({
                            data: {
                                projectId: project.id,
                                userId: dbUser.id,
                                role: 'Member'
                            }
                        })
                        console.log('[Debug] Added to project')
                    } else {
                        console.log('[Debug] Already member of project')
                    }
                }
            } else {
                console.log('[Debug] No workspace found, skipping workspace addition')
            }
        } else {
            console.log('[Debug] User already has a workspace, skipping addition')
        }


        console.log('[Debug] Auth simulation completed successfully!')

        // Cleanup
        console.log('[Debug] Cleaning up test user...')
        await prisma.user.delete({
            where: { email: user.email }
        })
        console.log('[Debug] Cleanup done')

    } catch (error) {
        console.error('[Debug] Error during auth simulation:', error)
    } finally {
        await prisma.$disconnect()
    }
}

debugAuth()
