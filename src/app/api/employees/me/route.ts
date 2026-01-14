// =============================================================================
// Employee Profile API - CVE-CB-005 Fixed: Secure Logging
// =============================================================================

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { prisma, withTransaction } from '@/lib/prisma'
import { secureLogger, createErrorResponse } from '@/lib/security'
import { notifyMissingProfile } from '@/lib/centrifugo-client'

// GET: 현재 로그인한 사용자의 직원 프로필 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    // 현재 사용자의 직원 레코드 조회
    const employee = await prisma.employee.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      },
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
      // 직원 레코드가 없으면 기본 정보로 생성
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })

      if (user) {
        const newEmployee = await prisma.employee.create({
          data: {
            workspaceId,
            userId: session.user.id,
            nameKor: user.name || '',
            email: user.email || '',
            status: 'ONBOARDING'
          },
          include: {
            educations: true,
            experiences: true,
            certificates: true,
            onboarding: true
          }
        })

        // 인사기록 미등록 알림 발송
        try {
          await notifyMissingProfile(session.user.id, workspaceId)
        } catch {
          // 알림 실패는 무시
        }

        return NextResponse.json({ employee: formatEmployeeResponse(newEmployee) })
      }

      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ employee: formatEmployeeResponse(employee) })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to fetch employee profile', error as Error, { operation: 'employees.me.get' })
    return createErrorResponse('Failed to fetch employee profile', 500, 'FETCH_FAILED')
  }
}

// PUT: 현재 사용자의 직원 프로필 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      nameKor,
      nameEng,
      mobile,
      birthDate,
      gender,
      address,
      addressDetail,
      bankName,
      bankAccount,
      emergencyContact,
      education,
      experience,
      certificates
    } = body

    // 현재 직원 레코드 찾기
    const employee = await prisma.employee.findFirst({
      where: {
        workspaceId,
        userId: session.user.id
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 100K CCU: 트랜잭션으로 데이터 정합성 보장 (다중 테이블 업데이트)
    const finalEmployee = await withTransaction(async (tx) => {
      // 직원 정보 업데이트
      await tx.employee.update({
        where: { id: employee.id },
        data: {
          nameKor: nameKor || employee.nameKor,
          nameEng,
          mobile,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          gender,
          address,
          addressDetail,
          bankName,
          bankAccount
        }
      })

      // 온보딩 정보 업데이트 (긴급연락처만)
      if (emergencyContact) {
        await tx.employeeOnboarding.upsert({
          where: { employeeId: employee.id },
          create: {
            employeeId: employee.id,
            emergencyName: emergencyContact?.name,
            emergencyRelation: emergencyContact?.relationship,
            emergencyPhone: emergencyContact?.phone,
          },
          update: {
            emergencyName: emergencyContact?.name,
            emergencyRelation: emergencyContact?.relationship,
            emergencyPhone: emergencyContact?.phone
          }
        })
      }

      // 학력 정보 업데이트
      if (education && Array.isArray(education)) {
        await tx.employeeEducation.deleteMany({
          where: { employeeId: employee.id }
        })

        if (education.length > 0) {
          await tx.employeeEducation.createMany({
            data: education.map((edu: any) => ({
              employeeId: employee.id,
              school: edu.school,
              degree: edu.degree,
              major: edu.major,
              graduationDate: edu.graduationDate ? new Date(edu.graduationDate) : null,
              status: edu.status || 'graduated'
            }))
          })
        }
      }

      // 경력 정보 업데이트
      if (experience && Array.isArray(experience)) {
        await tx.employeeExperience.deleteMany({
          where: { employeeId: employee.id }
        })

        if (experience.length > 0) {
          await tx.employeeExperience.createMany({
            data: experience.map((exp: any) => ({
              employeeId: employee.id,
              company: exp.company,
              position: exp.position,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              description: exp.description
            }))
          })
        }
      }

      // 자격증 정보 업데이트
      if (certificates && Array.isArray(certificates)) {
        await tx.employeeCertificate.deleteMany({
          where: { employeeId: employee.id }
        })

        if (certificates.length > 0) {
          await tx.employeeCertificate.createMany({
            data: certificates.map((cert: any) => ({
              employeeId: employee.id,
              name: cert.name,
              issuer: cert.issuer,
              issueDate: new Date(cert.issueDate),
              expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null
            }))
          })
        }
      }

      // 트랜잭션 내에서 최종 결과 조회
      return tx.employee.findUnique({
        where: { id: employee.id },
        include: {
          educations: true,
          experiences: true,
          certificates: true,
          onboarding: true
        }
      })
    })

    return NextResponse.json({ employee: formatEmployeeResponse(finalEmployee) })
  } catch (error) {
    // CVE-CB-005: Secure logging
    secureLogger.error('Failed to update employee profile', error as Error, { operation: 'employees.me.update' })
    return createErrorResponse('Failed to update employee profile', 500, 'UPDATE_FAILED')
  }
}

function formatEmployeeResponse(employee: any) {
  if (!employee) return null

  return {
    id: employee.id,
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
    education: employee.educations?.map((edu: any) => ({
      id: edu.id,
      school: edu.school,
      degree: edu.degree,
      major: edu.major,
      graduationDate: edu.graduationDate?.toISOString().split('T')[0],
      status: edu.status
    })),
    experience: employee.experiences?.map((exp: any) => ({
      id: exp.id,
      company: exp.company,
      position: exp.position,
      startDate: exp.startDate?.toISOString().split('T')[0],
      endDate: exp.endDate?.toISOString().split('T')[0],
      description: exp.description
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
    accountHolder: employee.nameKor,
    emergencyContact: employee.onboarding ? {
      name: employee.onboarding.emergencyName,
      relationship: employee.onboarding.emergencyRelation,
      phone: employee.onboarding.emergencyPhone
    } : null,
    dependents: employee.dependentCount || 0
  }
}
