import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // Create test users
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@codeb.com' },
        update: {
            id: 'test-admin-uid',
            name: '관리자',
            role: 'admin',
        },
        create: {
            id: 'test-admin-uid',
            email: 'admin@codeb.com',
            name: '관리자',
            role: 'admin',
            isActive: true,
        },
    })

    const memberUser = await prisma.user.upsert({
        where: { email: 'member@codeb.com' },
        update: {
            id: 'test-member-uid',
            name: '팀원',
            role: 'member',
        },
        create: {
            id: 'test-member-uid',
            email: 'member@codeb.com',
            name: '팀원',
            role: 'member',
            isActive: true,
        },
    })

    console.log('✅ Test users created:', { adminUser, memberUser })

    // Create default workspace
    const workspace = await prisma.workspace.upsert({
        where: { slug: 'default-workspace' },
        update: {},
        create: {
            name: '기본 워크스페이스',
            slug: 'default-workspace',
            domain: 'codeb.com',
            inviteCode: 'DEFAULT001',
        },
    })
    console.log('✅ Default workspace created:', workspace)

    // Add members to workspace
    await prisma.workspaceMember.upsert({
        where: {
            workspaceId_userId: {
                workspaceId: workspace.id,
                userId: adminUser.id,
            }
        },
        update: {},
        create: {
            workspaceId: workspace.id,
            userId: adminUser.id,
            role: 'admin',
        }
    })

    await prisma.workspaceMember.upsert({
        where: {
            workspaceId_userId: {
                workspaceId: workspace.id,
                userId: memberUser.id,
            }
        },
        update: {},
        create: {
            workspaceId: workspace.id,
            userId: memberUser.id,
            role: 'member',
        }
    })

    // Create sample project
    const project = await prisma.project.upsert({
        where: { id: 'sample-project-1' },
        update: {
            workspaceId: workspace.id,
        },
        create: {
            id: 'sample-project-1',
            workspaceId: workspace.id,
            name: 'CMS 개발 프로젝트',
            description: '프로젝트 관리 시스템 개발',
            status: 'development',
            progress: 45,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            budget: 50000000,
            visibility: 'private',
            priority: 'high',
            tags: ['개발', 'CMS', 'Next.js'],
            createdBy: adminUser.id,
            members: {
                create: [
                    {
                        userId: adminUser.id,
                        role: 'PM',
                    },
                    {
                        userId: memberUser.id,
                        role: 'Developer',
                    },
                ],
            },
        },
    })

    console.log('✅ Sample project created:', project)

    // Create sample tasks
    const tasks = await Promise.all([
        prisma.task.upsert({
            where: { id: 'task-1' },
            update: {},
            create: {
                id: 'task-1',
                projectId: project.id,
                title: '데이터베이스 마이그레이션',
                description: 'Firebase에서 PostgreSQL로 마이그레이션',
                status: 'in_progress',
                columnId: 'in_progress',
                order: 0,
                priority: 'high',
                assigneeId: adminUser.id,
                createdBy: adminUser.id,
                progress: 70,
                labels: ['backend', 'database'],
            },
        }),
        prisma.task.upsert({
            where: { id: 'task-2' },
            update: {},
            create: {
                id: 'task-2',
                projectId: project.id,
                title: 'UI 컴포넌트 리팩토링',
                description: 'shadcn/ui 컴포넌트로 전환',
                status: 'todo',
                columnId: 'todo',
                order: 0,
                priority: 'medium',
                assigneeId: memberUser.id,
                createdBy: adminUser.id,
                progress: 0,
                labels: ['frontend', 'ui'],
            },
        }),
        prisma.task.upsert({
            where: { id: 'task-3' },
            update: {},
            create: {
                id: 'task-3',
                projectId: project.id,
                title: '대시보드 차트 구현',
                description: 'Recharts를 사용한 데이터 시각화',
                status: 'done',
                columnId: 'done',
                order: 0,
                priority: 'medium',
                assigneeId: memberUser.id,
                createdBy: adminUser.id,
                progress: 100,
                labels: ['frontend', 'charts'],
            },
        }),
    ])

    console.log(`✅ ${tasks.length} sample tasks created`)

    console.log('🎉 Database seed completed!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
