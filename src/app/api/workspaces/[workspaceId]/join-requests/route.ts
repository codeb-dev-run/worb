// =============================================================================
// Workspace Join Requests API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { secureLogger, createErrorResponse } from '@/lib/security';

// POST /api/workspaces/[workspaceId]/join-requests - Create join request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { userId, message } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { role: 'admin' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Check if workspace requires approval
    if (!workspace.requireApproval && !workspace.isPublic) {
      return NextResponse.json(
        { error: 'This workspace does not accept join requests' },
        { status: 403 }
      );
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
          workspaceId,
          userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 400 }
      );
    }

    // Check if there's already a pending join request
    const existingRequest = await prisma.joinRequest.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json(
          { error: 'You already have a pending join request for this workspace' },
          { status: 400 }
        );
      } else if (existingRequest.status === 'REJECTED') {
        // Allow resubmission after rejection
        const joinRequest = await prisma.joinRequest.update({
          where: { id: existingRequest.id },
          data: {
            message,
            status: 'PENDING',
            reviewedBy: null,
            reviewedAt: null,
            reviewNote: null,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          joinRequest,
        });
      }
    }

    // Create join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        workspaceId,
        userId,
        message,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // CVE-CB-005: Secure logging - don't log user emails
    secureLogger.info('New join request created', {
      operation: 'workspaces.joinRequests.create',
      workspaceId,
      adminCount: workspace.members.length,
    });

    return NextResponse.json({
      success: true,
      joinRequest,
    });
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error creating join request', error as Error, { operation: 'workspaces.joinRequests.create' });
    return createErrorResponse('Failed to create join request', 500, 'CREATE_FAILED');
  }
}

// GET /api/workspaces/[workspaceId]/join-requests - List join requests
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const joinRequests = await prisma.joinRequest.findMany({
      where: {
        workspaceId,
        ...(status && { status: status as any }),
        ...(userId && { userId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ joinRequests });
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error fetching join requests', error as Error, { operation: 'workspaces.joinRequests.list' });
    return createErrorResponse('Failed to fetch join requests', 500, 'FETCH_FAILED');
  }
}
