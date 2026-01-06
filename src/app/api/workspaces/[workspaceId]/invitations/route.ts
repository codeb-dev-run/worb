// =============================================================================
// Workspace Invitations API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';
import { secureLogger, createErrorResponse } from '@/lib/security';

// POST /api/workspaces/[workspaceId]/invitations - Send invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { email, role, invitedBy } = await request.json();

    // Validate workspace exists and inviter has admin permission
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId: invitedBy },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const inviterMember = workspace.members[0];
    if (!inviterMember || inviterMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can send invitations' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: email, // This will need adjustment after user lookup
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        workspaceId,
        email,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Create invitation
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation = await prisma.invitation.create({
      data: {
        workspaceId,
        email,
        token,
        role: role || 'member',
        invitedBy,
        expiresAt,
      },
      include: {
        workspace: true,
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${token}`;

    try {
      const transporter = nodemailer.createTransport({
        host: 'mail.workb.net',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: 'noreply@workb.net',
          pass: process.env.MAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: '"CodeB Platform" <noreply@workb.net>',
        to: email,
        subject: `You've been invited to join ${workspace.name} on CodeB`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Join ${workspace.name} on CodeB Platform</h2>
            <p>Hi there,</p>
            <p>${invitation.inviter.name} (${invitation.inviter.email}) has invited you to join <strong>${workspace.name}</strong> on CodeB Platform.</p>
            <p>Click the button below to accept the invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #6B7280; word-break: break-all;">${invitationUrl}</p>
            <p style="color: #9CA3AF; font-size: 14px; margin-top: 40px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      // CVE-CB-005: Secure logging - don't expose email details
      secureLogger.warn('Failed to send invitation email', { operation: 'workspaces.invitations.sendEmail' });
      // Continue even if email fails - invitation is created in DB
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error creating invitation', error as Error, { operation: 'workspaces.invitations.create' });
    return createErrorResponse('Failed to create invitation', 500, 'CREATE_FAILED');
  }
}

// GET /api/workspaces/[workspaceId]/invitations - List invitations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId,
        ...(status && { status: status as any }),
      },
      include: {
        inviter: {
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

    return NextResponse.json({ invitations });
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Error fetching invitations', error as Error, { operation: 'workspaces.invitations.list' });
    return createErrorResponse('Failed to fetch invitations', 500, 'FETCH_FAILED');
  }
}
