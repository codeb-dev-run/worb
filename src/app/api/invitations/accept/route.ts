// =============================================================================
// Invitations Accept API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { secureLogger, createErrorResponse } from '@/lib/security';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

// POST /api/invitations/accept - Accept invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 'code' 또는 'token' 둘 다 지원
    const token = body.token || body.code;
    let userId = body.userId;

    console.log('[invitations/accept] Request:', { token, userId: userId || 'not provided' });

    if (!token) {
      console.log('[invitations/accept] Error: Token or code is required');
      return NextResponse.json(
        { error: 'Token or code is required' },
        { status: 400 }
      );
    }

    // 세션에서 사용자 정보 가져오기 (클라이언트에서 userId 안 보낸 경우)
    if (!userId) {
      const session = await getServerSession(authOptions);
      console.log('[invitations/accept] Session:', {
        hasSession: !!session,
        email: session?.user?.email || 'none',
        sessionId: (session?.user as any)?.id || 'none'
      });

      if (session?.user?.email) {
        // 이메일로 사용자 조회 (더 안정적)
        const sessionUser = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
        console.log('[invitations/accept] User lookup by email:', {
          email: session.user.email,
          found: !!sessionUser,
          userId: sessionUser?.id || 'not found'
        });
        if (sessionUser) {
          userId = sessionUser.id;
        }
      }
    }

    console.log('[invitations/accept] Final userId:', userId || 'none');

    // 1. 먼저 Invitation 토큰으로 찾기 (개인 초대)
    let invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: true,
      },
    });

    console.log('[invitations/accept] Invitation lookup:', {
      token,
      found: !!invitation,
      status: invitation?.status || 'N/A'
    });

    // 2. Invitation에 없으면 Workspace.inviteCode로 찾기 (공개 초대 코드)
    let workspace = null;
    let isPublicInviteCode = false;

    if (!invitation) {
      workspace = await prisma.workspace.findUnique({
        where: { inviteCode: token.toUpperCase() },
      });

      console.log('[invitations/accept] Workspace lookup by inviteCode:', {
        code: token.toUpperCase(),
        found: !!workspace,
        workspaceId: workspace?.id || 'not found',
        workspaceName: workspace?.name || 'N/A'
      });

      if (workspace) {
        isPublicInviteCode = true;
      } else {
        console.log('[invitations/accept] Error: Invalid invitation code');
        return NextResponse.json(
          { error: 'Invalid invitation code' },
          { status: 404 }
        );
      }
    }

    // === 개인 초대(Invitation) 처리 ===
    if (invitation) {
      // Check if already accepted
      if (invitation.status === 'ACCEPTED') {
        return NextResponse.json(
          { error: 'This invitation has already been accepted' },
          { status: 400 }
        );
      }

      // Check if expired
      if (invitation.status === 'EXPIRED' || new Date() > invitation.expiresAt) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
        return NextResponse.json(
          { error: 'This invitation has expired' },
          { status: 400 }
        );
      }

      // Check if revoked
      if (invitation.status === 'REVOKED') {
        return NextResponse.json(
          { error: 'This invitation has been revoked' },
          { status: 400 }
        );
      }

      // For new users, create user account first
      if (!userId) {
        return NextResponse.json({
          requiresSignup: true,
          workspace: {
            id: invitation.workspace.id,
            name: invitation.workspace.name,
          },
          invitation: {
            email: invitation.email,
            role: invitation.role,
          },
        });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: userId,
          },
        },
      });

      if (existingMember) {
        // Update invitation status but don't add duplicate member
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          alreadyMember: true,
          message: 'You are already a member of this workspace',
          workspace: invitation.workspace,
        });
      }

      // Add user to workspace and mark invitation as accepted
      const [workspaceMember] = await prisma.$transaction([
        prisma.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: userId,
            role: invitation.role,
          },
        }),
        prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        workspace: invitation.workspace,
        member: workspaceMember,
      });
    }

    // === 공개 초대 코드(Workspace.inviteCode) 처리 ===
    if (isPublicInviteCode && workspace) {
      console.log('[invitations/accept] Processing public invite code for workspace:', workspace.name);

      // userId가 없으면 로그인 필요
      if (!userId) {
        console.log('[invitations/accept] No userId - requiresSignup');
        return NextResponse.json({
          requiresSignup: true,
          workspace: {
            id: workspace.id,
            name: workspace.name,
          },
        });
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      console.log('[invitations/accept] User verification:', {
        userId,
        userExists: !!user,
        userEmail: user?.email || 'N/A'
      });

      if (!user) {
        console.log('[invitations/accept] Error: User not found by id:', userId);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: userId,
          },
        },
      });

      console.log('[invitations/accept] Existing member check:', {
        workspaceId: workspace.id,
        userId,
        isAlreadyMember: !!existingMember
      });

      if (existingMember) {
        console.log('[invitations/accept] User is already a member');
        return NextResponse.json({
          success: true,
          alreadyMember: true,
          message: 'You are already a member of this workspace',
          workspace: workspace,
        });
      }

      console.log('[invitations/accept] Creating new workspace member');

      // Add user to workspace with 'member' role
      const workspaceMember = await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: userId,
          role: 'member',
        },
      });

      console.log('[invitations/accept] Successfully added member:', {
        workspaceId: workspace.id,
        userId,
        memberId: workspaceMember.id
      });

      secureLogger.info('User joined via public invite code', {
        operation: 'invitations.accept.publicCode',
        workspaceId: workspace.id,
      });

      return NextResponse.json({
        success: true,
        workspace: workspace,
        member: workspaceMember,
      });
    }

    // 도달하면 안 됨
    console.log('[invitations/accept] Error: Reached unreachable code');
    return NextResponse.json(
      { error: 'Invalid invitation' },
      { status: 400 }
    );
  } catch (error: any) {
    // CVE-CB-005: Secure logging
    console.error('[invitations/accept] Exception:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'N/A',
      stack: error?.stack?.split('\n').slice(0, 3).join('\n') || 'N/A'
    });
    secureLogger.error('Error accepting invitation', error as Error, { operation: 'invitations.accept' });
    return createErrorResponse('Failed to accept invitation', 500, 'ACCEPT_FAILED');
  }
}

// GET /api/invitations/accept?token=xxx - Get invitation details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check expiration
    const isExpired = new Date() > invitation.expiresAt;
    if (isExpired && invitation.status === 'PENDING') {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: isExpired ? 'EXPIRED' : invitation.status,
        expiresAt: invitation.expiresAt,
        workspace: invitation.workspace,
        inviter: invitation.inviter,
      },
    });
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error fetching invitation', error as Error, { operation: 'invitations.get' });
    return createErrorResponse('Failed to fetch invitation', 500, 'FETCH_FAILED');
  }
}
