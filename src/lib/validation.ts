// =============================================================================
// Input Validation Library - CVE-CB-007 & CVE-CB-009 Remediation
// Zod-based validation schemas for all API inputs
// =============================================================================

import { z } from 'zod'
import { NextResponse } from 'next/server'

// =============================================================================
// Custom HTML Sanitizer (No ESM dependencies)
// =============================================================================

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape all HTML special characters
 */
function escapeAllHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char)
}

/**
 * Custom sanitizer that strips all HTML tags
 */
function stripAllTags(input: string): string {
  if (!input || typeof input !== 'string') return ''
  // Remove all HTML tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags and content
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Custom sanitizer that allows specific safe HTML tags
 */
function sanitizeWithAllowedTags(
  input: string,
  allowedTags: string[] = [],
  allowedAttrs: string[] = []
): string {
  if (!input || typeof input !== 'string') return ''

  // First remove dangerous content
  let result = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')

  // If no tags allowed, strip all
  if (allowedTags.length === 0) {
    return stripAllTags(result)
  }

  // Create regex to match allowed tags
  const tagPattern = allowedTags.join('|')
  const allowedTagRegex = new RegExp(`<(?!\/?(?:${tagPattern})(?:\\s|>|\\/))[^>]*>`, 'gi')

  // Remove disallowed tags
  result = result.replace(allowedTagRegex, '')

  // Remove disallowed attributes from remaining tags
  if (allowedAttrs.length > 0) {
    const attrPattern = allowedAttrs.join('|')
    // Keep only allowed attributes
    result = result.replace(/<(\w+)([^>]*)>/gi, (match, tag, attrs) => {
      if (!allowedTags.includes(tag.toLowerCase())) return match
      const cleanAttrs = attrs.replace(/\s*(\w+)(?:=["'][^"']*["'])?/gi, (attrMatch: string, attrName: string) => {
        if (allowedAttrs.includes(attrName.toLowerCase())) {
          return attrMatch
        }
        return ''
      })
      return `<${tag}${cleanAttrs}>`
    })
  }

  return result.trim()
}

// DOMPurify-compatible wrapper for existing code
const DOMPurify = {
  sanitize: (input: string, options?: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[] }) => {
    if (!options || !options.ALLOWED_TAGS || options.ALLOWED_TAGS.length === 0) {
      return stripAllTags(input)
    }
    return sanitizeWithAllowedTags(input, options.ALLOWED_TAGS, options.ALLOWED_ATTR || [])
  }
}

// =============================================================================
// Legacy Functions (Backward Compatibility)
// =============================================================================

/**
 * XSS 방지를 위한 HTML 살균
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  })
}

/**
 * 일반 텍스트 입력 검증
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[<>]/g, '') // HTML 태그 제거
    .slice(0, 1000) // 최대 길이 제한
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 프로젝트 이름 검증
 */
export function validateProjectName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: '프로젝트 이름을 입력해주세요.' }
  }
  if (name.length < 2) {
    return { isValid: false, error: '프로젝트 이름은 최소 2자 이상이어야 합니다.' }
  }
  if (name.length > 100) {
    return { isValid: false, error: '프로젝트 이름은 100자를 초과할 수 없습니다.' }
  }
  if (!/^[가-힣a-zA-Z0-9\s\-_]+$/.test(name)) {
    return { isValid: false, error: '프로젝트 이름에는 특수문자를 사용할 수 없습니다.' }
  }
  return { isValid: true }
}

/**
 * 파일 업로드 검증
 */
export function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { isValid: false, error: '허용되지 않은 파일 형식입니다.' }
  }

  return { isValid: true }
}

/**
 * SQL Injection 방지를 위한 쿼리 파라미터 검증
 */
export function sanitizeQueryParam(param: string): string {
  return param
    .replace(/['"\\;]/g, '') // 위험한 문자 제거
    .trim()
    .slice(0, 100) // 최대 길이 제한
}

// =============================================================================
// Common Validation Patterns (Zod)
// =============================================================================

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Email validation
export const emailSchema = z.string().email('Invalid email format').max(255)

// Safe string - no HTML/script injection
export const safeStringSchema = z.string().transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))

// Rich text - allows safe HTML
export const richTextSchema = z.string().transform(val =>
  DOMPurify.sanitize(val, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
)

// Safe search string - alphanumeric, spaces, and common punctuation
export const searchSchema = z.string()
  .max(100, 'Search query too long')
  .regex(/^[a-zA-Z0-9가-힣\s\-_.,!?@#$%&*()]*$/, 'Invalid characters in search')
  .optional()

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// =============================================================================
// Workspace Schemas
// =============================================================================

export const workspaceCreateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  domain: z.string()
    .min(3, 'Domain must be at least 3 characters')
    .max(50, 'Domain must be less than 50 characters')
    .regex(/^[a-z0-9\-]+$/, 'Domain can only contain lowercase letters, numbers, and hyphens'),
  type: z.enum(['ENTERPRISE', 'HR_ONLY', 'PROJECT_ONLY']).default('ENTERPRISE'),
})

export const workspaceUpdateSchema = workspaceCreateSchema.partial()

// =============================================================================
// Project Schemas
// =============================================================================

export const projectCreateSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
    .optional(),
  workspaceId: uuidSchema,
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).default('planning'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
})

export const projectUpdateSchema = projectCreateSchema.partial().omit({ workspaceId: true })

export const projectSearchSchema = z.object({
  workspaceId: uuidSchema.optional(),
  search: searchSchema,
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  ...paginationSchema.shape,
})

// =============================================================================
// Task Schemas
// =============================================================================

export const taskCreateSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(500, 'Title must be less than 500 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  description: richTextSchema.optional(),
  projectId: uuidSchema,
  assigneeId: uuidSchema.optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.coerce.date().optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const taskUpdateSchema = taskCreateSchema.partial().omit({ projectId: true })

// =============================================================================
// Announcement Schemas
// =============================================================================

export const announcementCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  content: richTextSchema
    .refine(val => val.length > 0, 'Content is required'),
  workspaceId: uuidSchema,
  authorId: uuidSchema,
  isPinned: z.boolean().default(false),
})

export const announcementUpdateSchema = announcementCreateSchema.partial().omit({ workspaceId: true, authorId: true })

export const announcementQuerySchema = z.object({
  workspaceId: uuidSchema.optional(),
  ...paginationSchema.shape,
})

// =============================================================================
// Board Post Schemas
// =============================================================================

export const boardPostCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  content: richTextSchema
    .refine(val => val.length > 0, 'Content is required'),
  workspaceId: uuidSchema,
  authorId: uuidSchema,
  category: z.string().max(50).default(''),
  isPinned: z.boolean().default(false),
})

export const boardPostUpdateSchema = boardPostCreateSchema.partial().omit({ workspaceId: true, authorId: true })

export const boardQuerySchema = z.object({
  workspaceId: uuidSchema.optional(),
  category: z.string().max(50).optional(),
  ...paginationSchema.shape,
})

// =============================================================================
// Attendance Schemas
// =============================================================================

export const attendanceCheckInSchema = z.object({
  workLocation: z.enum(['OFFICE', 'REMOTE', 'FIELD']).default('OFFICE'),
  note: z.string().max(500).optional(),
  // WiFi 검증 정보
  wifiSSID: z.string().max(100).optional(),
  wifiBSSID: z.string().max(50).optional(),
  workspaceId: z.string().uuid().optional(),
  // 이어서 근무하기 (퇴근 후 다른 장소에서 근무 재개)
  isResume: z.boolean().optional(),
  // IP 주소 (자동 감지)
  ipAddress: z.string().max(50).optional(),
})

// WiFi 네트워크 등록 스키마
export const wifiNetworkSchema = z.object({
  name: z.string().min(1).max(100),
  ssid: z.string().min(1).max(100),
  bssid: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
})

// 근무 세션 시작 스키마
export const workSessionStartSchema = z.object({
  workspaceId: z.string().uuid(),
  sessionType: z.enum(['OFFICE_WORK', 'REMOTE_WORK']).default('OFFICE_WORK'),
  wifiSSID: z.string().max(100).optional(),
  wifiBSSID: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
})

// 근무 세션 종료 스키마
export const workSessionEndSchema = z.object({
  sessionId: z.string().uuid(),
  note: z.string().max(500).optional(),
})

export const attendanceQuerySchema = z.object({
  userId: uuidSchema.optional(),
  workspaceId: uuidSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ...paginationSchema.shape,
})

// =============================================================================
// User Schemas
// =============================================================================

export const userUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
    .optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  phone: z.string()
    .regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone number format')
    .max(20)
    .optional(),
  avatar: z.string().url().optional(),
})

// =============================================================================
// Invitation Schemas
// =============================================================================

export const invitationCreateSchema = z.object({
  email: emailSchema,
  workspaceId: uuidSchema,
  role: z.enum(['admin', 'manager', 'member', 'viewer']).default('member'),
  message: z.string().max(500).optional(),
})

// =============================================================================
// Employee Schemas - CVE-CB-009
// =============================================================================

export const employeeCreateSchema = z.object({
  userId: uuidSchema.optional(),
  nameKor: z.string()
    .min(1, 'Korean name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  nameEng: z.string()
    .max(100, 'Name must be less than 100 characters')
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }))
    .optional(),
  email: emailSchema,
  mobile: z.string()
    .regex(/^[+]?[\d\s\-()]+$/, 'Invalid phone number format')
    .max(20)
    .optional(),
  employeeNumber: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  hireDate: z.coerce.date().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  payrollType: z.enum(['MONTHLY', 'HOURLY', 'DAILY']).default('MONTHLY'),
  baseSalaryMonthly: z.number().min(0).optional(),
  hourlyWage: z.number().min(0).optional(),
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
})

export const employeeUpdateSchema = employeeCreateSchema.partial()

// =============================================================================
// Validation Helper Functions
// =============================================================================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodError['issues']
}

/**
 * Validate request body against a schema
 */
export async function validateBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues,
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch {
    return {
      success: false,
      errors: [{ code: 'custom', message: 'Invalid JSON body', path: [] }] as z.ZodError['issues'],
    }
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): ValidationResult<z.infer<T>> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues,
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Create validation error response
 */
export function validationErrorResponse(errors: z.ZodError['issues']): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.map(e => ({
        field: e.path.map(String).join('.'),
        message: e.message,
      })),
    },
    { status: 400 }
  )
}

// =============================================================================
// XSS Prevention Utilities
// =============================================================================

/**
 * Sanitize string for safe output (removes all HTML)
 */
export function sanitizeString(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

/**
 * Sanitize rich text (allows safe HTML)
 */
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(input: string): string {
  return escapeAllHtml(input)
}
