// =============================================================================
// Join Request Review API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { secureLogger, createErrorResponse } from '@/lib/security';

// POST /api/workspaces/[workspaceId]/join-requests/[requestId]/review - Approve or reject join request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; requestId: string }> }
) {
  try {
    const { workspaceId, requestId } = await params;
    const { reviewerId, action, reviewNote } = await request.json();

    if (!reviewerId || !action) {
      return NextResponse.json(
        { error: 'Reviewer ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Verify reviewer has admin permission
    const reviewer = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: reviewerId,
        },
      },
    });

    if (!reviewer || reviewer.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can review join requests' },
        { status: 403 }
      );
    }

    // Find join request
    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
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

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      );
    }

    if (joinRequest.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Join request does not belong to this workspace' },
        { status: 400 }
      );
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `This join request has already been ${joinRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Check if user is already a member (race condition check)
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: joinRequest.userId,
          },
        },
      });

      if (existingMember) {
        // Update join request status but don't add duplicate member
        await prisma.joinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNote,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'User is already a member of this workspace',
        });
      }

      // Approve: Add user to workspace and update join request
      const [workspaceMember, updatedRequest] = await prisma.$transaction([
        prisma.workspaceMember.create({
          data: {
            workspaceId,
            userId: joinRequest.userId,
            role: 'member',
          },
        }),
        prisma.joinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedBy: reviewerId,
            reviewedAt: new Date(),
            reviewNote,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
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
        }),
      ]);

      // CVE-CB-005: Secure logging - don't log personal details
      secureLogger.info('Join request approved', {
        operation: 'workspaces.joinRequests.approve',
        workspaceId,
        requestId,
      });

      return NextResponse.json({
        success: true,
        joinRequest: updatedRequest,
        member: workspaceMember,
      });
    } else {
      // Reject: Update join request status
      const updatedRequest = await prisma.joinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
      });

      // CVE-CB-005: Secure logging - don't log personal details
      secureLogger.info('Join request rejected', {
        operation: 'workspaces.joinRequests.reject',
        workspaceId,
        requestId,
      });

      return NextResponse.json({
        success: true,
        joinRequest: updatedRequest,
      });
    }
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error reviewing join request', error as Error, { operation: 'workspaces.joinRequests.review' });
    return createErrorResponse('Failed to review join request', 500, 'REVIEW_FAILED');
  }
}

// DELETE /api/workspaces/[workspaceId]/join-requests/[requestId]/review - Cancel join request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find join request
    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this join request
    if (joinRequest.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only cancel your own join requests' },
        { status: 403 }
      );
    }

    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending join requests can be cancelled' },
        { status: 400 }
      );
    }

    // Cancel join request
    const updatedRequest = await prisma.joinRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
      },
    });

    return NextResponse.json({
      success: true,
      joinRequest: updatedRequest,
    });
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error cancelling join request', error as Error, { operation: 'workspaces.joinRequests.cancel' });
    return createErrorResponse('Failed to cancel join request', 500, 'CANCEL_FAILED');
  }
}
