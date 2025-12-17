// =============================================================================
// OpenAPI/Swagger Configuration
// =============================================================================

import { createSwaggerSpec } from 'next-swagger-doc'

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'CodeB Platform API',
        version: '1.0.0',
        description: `
## CodeB Platform REST API

CodeB Platform은 웹 에이전시를 위한 통합 프로젝트 관리 플랫폼입니다.

### 인증
모든 API는 NextAuth.js 기반 세션 인증을 사용합니다.
- Cookie 기반 세션 인증
- Google OAuth 2.0 지원

### 공통 응답 코드
| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 429 | 요청 횟수 초과 |
| 500 | 서버 오류 |

### Rate Limiting
- API 요청: 100 req/min
- 인증 요청: 10 req/min
        `,
        contact: {
          name: 'CodeB Support',
          email: 'support@codeb.app',
          url: 'https://codeb.app',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003',
          description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
        },
      ],
      tags: [
        { name: 'Health', description: '서버 상태 확인' },
        { name: 'Auth', description: '인증 관련 API' },
        { name: 'Workspaces', description: '워크스페이스 관리' },
        { name: 'Projects', description: '프로젝트 관리' },
        { name: 'Employees', description: '직원 관리' },
        { name: 'Attendance', description: '출퇴근 관리' },
        { name: 'Leave', description: '휴가 관리' },
        { name: 'Payroll', description: '급여 관리' },
        { name: 'HR', description: 'HR 통계 및 내보내기' },
        { name: 'Board', description: '게시판 관리' },
        { name: 'Workflows', description: '워크플로우 자동화' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'next-auth.session-token',
            description: 'NextAuth.js 세션 쿠키',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', description: '오류 메시지' },
              code: { type: 'string', description: '오류 코드' },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', description: '현재 페이지' },
              limit: { type: 'integer', description: '페이지당 항목 수' },
              total: { type: 'integer', description: '전체 항목 수' },
              totalPages: { type: 'integer', description: '전체 페이지 수' },
            },
          },
          Workspace: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              slug: { type: 'string' },
              plan: { type: 'string', enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Project: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] },
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Employee: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              employeeNumber: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              department: { type: 'string' },
              position: { type: 'string' },
              joinDate: { type: 'string', format: 'date' },
              status: { type: 'string', enum: ['ACTIVE', 'ON_LEAVE', 'RESIGNED'] },
            },
          },
          AttendanceRecord: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              employeeId: { type: 'string', format: 'uuid' },
              date: { type: 'string', format: 'date' },
              checkIn: { type: 'string', format: 'date-time' },
              checkOut: { type: 'string', format: 'date-time' },
              status: { type: 'string', enum: ['PRESENT', 'LATE', 'ABSENT', 'LEAVE'] },
              workHours: { type: 'number' },
            },
          },
          LeaveRequest: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              employeeId: { type: 'string', format: 'uuid' },
              type: { type: 'string', enum: ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY'] },
              startDate: { type: 'string', format: 'date' },
              endDate: { type: 'string', format: 'date' },
              status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
              reason: { type: 'string' },
            },
          },
        },
      },
      security: [{ cookieAuth: [] }],
    },
  })
  return spec
}
