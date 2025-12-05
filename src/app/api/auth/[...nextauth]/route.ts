// =============================================================================
// Auth.js v5 API Route Handler
// =============================================================================

import { handlers } from '@/auth'

export const { GET, POST } = handlers

// Edge Runtime 비활성화 (Prisma 호환성)
export const runtime = 'nodejs'
