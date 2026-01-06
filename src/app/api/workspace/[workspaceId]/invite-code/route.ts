import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/security'

// GET: 현재 초대 코드 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
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

    // 워크스페이스 멤버인지 확인 (관리자만 조회 가능)
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
        role: 'admin'
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 워크스페이스 초대 코드 조회
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { inviteCode: true }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json({ inviteCode: workspace.inviteCode })
  } catch (error) {
    console.error('Failed to get invite code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 초대 코드 재생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
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

    // 워크스페이스 관리자인지 확인
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: user.id,
        role: 'admin'
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 새 초대 코드 생성
    const newInviteCode = generateSecureToken(6).toUpperCase()

    // 워크스페이스 업데이트
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { inviteCode: newInviteCode },
      select: { inviteCode: true }
    })

    return NextResponse.json({ inviteCode: workspace.inviteCode })
  } catch (error) {
    console.error('Failed to regenerate invite code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
