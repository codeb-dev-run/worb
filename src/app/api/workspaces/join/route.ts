import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// POST: 워크스페이스 가입
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 이메일로 사용자 조회 (더 안정적)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { workspaceId } = await request.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // 워크스페이스 존재 확인
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        requireApproval: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: '워크스페이스를 찾을 수 없습니다' }, { status: 404 })
    }

    // 이미 멤버인지 확인
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id
      }
    })

    if (existingMember) {
      return NextResponse.json({
        message: '이미 이 워크스페이스의 멤버입니다',
        alreadyMember: true,
        workspaceId: workspace.id,
        workspaceName: workspace.name
      })
    }

    // 승인이 필요한 경우 가입 요청 생성
    if (workspace.requireApproval) {
      // JoinRequest 모델이 있는지 확인하고 생성
      // 여기서는 일단 바로 가입 처리 (나중에 승인 시스템 구현 시 수정)
      // return NextResponse.json({
      //   message: '가입 요청이 전송되었습니다. 관리자의 승인을 기다려주세요.',
      //   status: 'pending_approval'
      // })
    }

    // 멤버로 추가
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: 'member'
      }
    })

    return NextResponse.json({
      message: `${workspace.name} 워크스페이스에 가입되었습니다`,
      workspaceId: workspace.id,
      workspaceName: workspace.name
    })
  } catch (error) {
    console.error('Failed to join workspace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
