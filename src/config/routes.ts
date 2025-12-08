// =============================================================================
// Route Configuration - 라우트 설정 중앙화
// =============================================================================

/**
 * 페이지 접근 레벨
 * - GUEST_ONLY: 비로그인만 접근 가능 (로그인 시 /dashboard로 리다이렉트)
 * - PUBLIC: 누구나 접근 가능
 * - AUTH_REQUIRED: 로그인 필수 (워크스페이스 불필요)
 * - PROTECTED: 로그인 + 워크스페이스 필수
 */

// Guest Only - 로그인 시 접근 불가
export const GUEST_ONLY_ROUTES = ['/login', '/forgot-password']

// Public - 누구나 접근 가능 (prefix match)
export const PUBLIC_ROUTES = [
  '/',
  '/invite',
  '/invitations/accept',
]

// Auth Required - 로그인 필수, 워크스페이스 불필요
export const AUTH_REQUIRED_ROUTES = [
  '/workspace/create',
  '/workspaces/join',
]

// Protected Routes by Role
export const PROTECTED_ROUTES = {
  // 모든 멤버 접근 가능
  member: [
    '/dashboard',
    '/profile',
    '/calendar',
    '/messages',
    '/tasks',
    '/kanban',
    '/gantt',
    '/files',
    '/logs',
    '/ai',
    '/analytics',
    '/meetings',
    '/deliverables',
    '/projects',
    '/groupware',
    '/automation',
    '/marketing',
  ],

  // OWNER, ADMIN만
  admin: ['/settings', '/users', '/workspace/organization'],

  // OWNER, HR_ADMIN만
  hr: ['/hr'],

  // OWNER, FINANCE_ADMIN만
  finance: ['/finance', '/contracts', '/invoices'],
}

// 라우트 경로 상수
export const ROUTES = {
  // Public
  home: '/',
  login: '/login',
  forgotPassword: '/forgot-password',

  // Invite
  invite: (code: string) => `/invite/${code}`,
  inviteEmployee: (code: string) => `/invite/employee/${code}`,
  inviteProject: (token: string) => `/invite/project/${token}`,
  invitationsAccept: '/invitations/accept',

  // Auth Required
  workspaceCreate: '/workspace/create',
  workspacesJoin: '/workspaces/join',
  workspacesJoinSuccess: '/workspaces/join/success',

  // Protected - Basic
  dashboard: '/dashboard',
  profile: '/profile',
  calendar: '/calendar',
  messages: '/messages',
  tasks: '/tasks',
  kanban: '/kanban',
  gantt: '/gantt',
  files: '/files',
  logs: '/logs',
  ai: '/ai',
  analytics: '/analytics',
  meetings: '/meetings',
  deliverables: '/deliverables',

  // Protected - Projects
  projects: '/projects',
  project: (id: string) => `/projects/${id}`,
  projectKanban: (id: string) => `/projects/${id}/kanban`,
  projectGantt: (id: string) => `/projects/${id}/gantt`,

  // Protected - Groupware
  groupware: '/groupware',
  announcements: '/groupware/announcements',
  board: '/groupware/board',

  // Protected - Automation
  automation: '/automation',
  automationRuns: '/automation/runs',

  // Protected - Marketing
  marketing: '/marketing',

  // Protected - HR (OWNER, HR_ADMIN)
  hr: '/hr',
  hrAttendance: '/hr/attendance',
  hrLeave: '/hr/leave',
  users: '/users',

  // Protected - Finance (OWNER, FINANCE_ADMIN)
  finance: '/finance',
  financeContracts: '/finance/contracts',
  financeCorporateCards: '/finance/corporate-cards',
  financeExpenses: '/finance/expenses',
  financeInvoices: '/finance/invoices',
  financePL: '/finance/pl',
  contracts: '/contracts',
  invoices: '/invoices',

  // Protected - Settings (OWNER, ADMIN)
  settings: '/settings',
  settingsFeatures: '/settings/features',
  workspaceOrganization: '/workspace/organization',
}

// =============================================================================
// Route Matching Utilities
// =============================================================================

/**
 * 주어진 경로가 Guest Only 라우트인지 확인
 */
export function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * 주어진 경로가 Public 라우트인지 확인
 */
export function isPublicRoute(pathname: string): boolean {
  // 정확히 일치하거나 prefix로 시작하는 경우
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') return pathname === '/'
    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

/**
 * 주어진 경로가 Auth Required 라우트인지 확인
 */
export function isAuthRequiredRoute(pathname: string): boolean {
  return AUTH_REQUIRED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * 주어진 경로가 Protected 라우트인지 확인
 */
export function isProtectedRoute(pathname: string): boolean {
  const allProtectedRoutes = [
    ...PROTECTED_ROUTES.member,
    ...PROTECTED_ROUTES.admin,
    ...PROTECTED_ROUTES.hr,
    ...PROTECTED_ROUTES.finance,
  ]

  return allProtectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * 주어진 경로가 Admin 전용 라우트인지 확인
 */
export function isAdminRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.admin.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * 주어진 경로가 HR 라우트인지 확인
 */
export function isHRRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.hr.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * 주어진 경로가 Finance 라우트인지 확인
 */
export function isFinanceRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.finance.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}
