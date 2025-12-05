// =============================================================================
// Employee Detail API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'

// GET: 특정 직원 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 권한 확인 (관리자 또는 본인)
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const employee = await prisma.employee.findFirst({
      where: { id, workspaceId },
      include: {
        educations: true,
        experiences: true,
        certificates: true,
        onboarding: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 본인이 아니고 관리자도 아닌 경우 제한된 정보만 반환
    const isAdmin = membership.role === 'admin'
    const isSelf = employee.userId === session.user.id

    if (!isAdmin && !isSelf) {
      return NextResponse.json({
        employee: {
          id: employee.id,
          nameKor: employee.nameKor,
          nameEng: employee.nameEng,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          jobTitle: employee.jobTitle,
          profileImage: employee.user?.avatar
        }
      })
    }

    return NextResponse.json({ employee: formatEmployeeResponse(employee) })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to fetch employee', error as Error, { operation: 'employees.get' })
    return createErrorResponse('Failed to fetch employee', 500, 'FETCH_FAILED')
  }
}

// PUT: 직원 정보 수정 (관리자 전용)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
        role: 'admin'
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nameKor,
      nameEng,
      email,
      mobile,
      employeeNumber,
      department,
      position,
      jobTitle,
      hireDate,
      employmentType,
      status,
      payrollType,
      baseSalaryMonthly,
      hourlyWage,
      bankName,
      bankAccount
    } = body

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        nameKor,
        nameEng,
        email,
        mobile,
        employeeNumber,
        department,
        position,
        jobTitle,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        employmentType,
        status,
        payrollType,
        baseSalaryMonthly,
        hourlyWage,
        bankName,
        bankAccount
      },
      include: {
        educations: true,
        experiences: true,
        certificates: true,
        onboarding: true
      }
    })

    return NextResponse.json({ employee: formatEmployeeResponse(employee) })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to update employee', error as Error, { operation: 'employees.update' })
    return createErrorResponse('Failed to update employee', 500, 'UPDATE_FAILED')
  }
}

// DELETE: 직원 삭제 (관리자 전용)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 관리자 권한 확인
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
        role: 'admin'
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 관련 데이터 삭제 (cascade)
    await prisma.$transaction([
      prisma.employeeEducation.deleteMany({ where: { employeeId: id } }),
      prisma.employeeExperience.deleteMany({ where: { employeeId: id } }),
      prisma.employeeCertificate.deleteMany({ where: { employeeId: id } }),
      prisma.employeeOnboarding.deleteMany({ where: { employeeId: id } }),
      prisma.payrollRecord.deleteMany({ where: { employeeId: id } }),
      prisma.employee.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to delete employee', error as Error, { operation: 'employees.delete' })
    return createErrorResponse('Failed to delete employee', 500, 'DELETE_FAILED')
  }
}

function formatEmployeeResponse(employee: any) {
  if (!employee) return null

  return {
    id: employee.id,
    userId: employee.userId,
    nameKor: employee.nameKor,
    nameEng: employee.nameEng,
    email: employee.email,
    phone: employee.mobile,
    mobile: employee.mobile,
    birthDate: employee.birthDate?.toISOString().split('T')[0],
    gender: employee.gender,
    profileImage: employee.user?.avatar || employee.profileImage,
    address: employee.address,
    addressDetail: employee.addressDetail,
    employeeNumber: employee.employeeNumber,
    department: employee.department,
    position: employee.position,
    jobTitle: employee.jobTitle,
    hireDate: employee.hireDate?.toISOString().split('T')[0],
    employmentType: employee.employmentType,
    status: employee.status,
    payrollType: employee.payrollType,
    baseSalaryMonthly: employee.baseSalaryMonthly,
    hourlyWage: employee.hourlyWage,
    education: employee.educations?.map((edu: any) => ({
      id: edu.id,
      school: edu.school,
      degree: edu.degree,
      major: edu.major,
      graduationDate: edu.endDate?.toISOString().split('T')[0],
      isGraduated: edu.isGraduated
    })),
    experience: employee.experiences?.map((exp: any) => ({
      id: exp.id,
      company: exp.company,
      position: exp.position,
      startDate: exp.startDate?.toISOString().split('T')[0],
      endDate: exp.endDate?.toISOString().split('T')[0],
      duties: exp.duties
    })),
    certificates: employee.certificates?.map((cert: any) => ({
      id: cert.id,
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate?.toISOString().split('T')[0],
      expiryDate: cert.expiryDate?.toISOString().split('T')[0]
    })),
    bankName: employee.bankName,
    accountNumber: employee.bankAccount,
    emergencyContact: employee.onboarding ? {
      name: employee.onboarding.emergencyName,
      relationship: employee.onboarding.emergencyRelation,
      phone: employee.onboarding.emergencyPhone
    } : null
  }
}
