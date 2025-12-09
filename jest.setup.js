import '@testing-library/jest-dom'

// Mock server-only package (prevents import error in tests)
jest.mock('server-only', () => ({}))

// Mock ioredis (prevents Redis connection attempts in tests)
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    mget: jest.fn().mockResolvedValue([]),
    pipeline: jest.fn().mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    scan: jest.fn().mockResolvedValue(['0', []]),
    smembers: jest.fn().mockResolvedValue([]),
    publish: jest.fn().mockResolvedValue(0),
    subscribe: jest.fn().mockResolvedValue(0),
    duplicate: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('redis_version:7.0.0\r\nuptime_in_seconds:1000\r\nconnected_clients:1'),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
  }

  const Redis = jest.fn(() => mockRedis)
  Redis.Cluster = jest.fn(() => mockRedis)

  return Redis
})

// Mock @/lib/redis module
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    mget: jest.fn().mockResolvedValue([]),
    pipeline: jest.fn().mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
  CacheKeys: {
    dashboardStats: jest.fn((id) => `dashboard:${id}:stats`),
    projectStats: jest.fn((id) => `project:${id}:stats`),
    hrStats: jest.fn((id) => `hr:${id}:stats`),
    employees: jest.fn((id) => `hr:${id}:employees`),
    employee: jest.fn((wid, eid) => `hr:${wid}:employee:${eid}`),
    attendance: jest.fn((id) => `attendance:${id}:today`),
    attendanceHistory: jest.fn((id) => `attendance:${id}:history`),
    attendanceStats: jest.fn((id) => `attendance:${id}:stats`),
    payroll: jest.fn((id) => `payroll:${id}:list`),
    payrollRecord: jest.fn((id) => `payroll:record:${id}`),
    payrollSummary: jest.fn((wid, year) => `payroll:${wid}:summary:${year}`),
    projectTasks: jest.fn((id) => `project:${id}:tasks`),
    task: jest.fn((id) => `task:${id}`),
    workspaceMembers: jest.fn((id) => `workspace:${id}:members`),
    workspaceSettings: jest.fn((id) => `workspace:${id}:settings`),
    userSession: jest.fn((id) => `session:${id}`),
    userPermissions: jest.fn((uid, wid) => `permissions:${uid}:${wid}`),
  },
  CacheTTL: {
    SHORT: 60,
    ATTENDANCE: 60,
    MEDIUM: 300,
    DASHBOARD: 300,
    TASKS: 300,
    LONG: 3600,
    HR_STATS: 3600,
    EMPLOYEES: 3600,
    PAYROLL: 3600,
    EXTENDED: 86400,
    SETTINGS: 86400,
    PERMISSIONS: 86400,
  },
  getOrSet: jest.fn((key, fetcher) => fetcher()),
  mGetOrSet: jest.fn((keys, fetcher) => fetcher(keys)),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  invalidateCachePattern: jest.fn().mockResolvedValue(undefined),
  invalidateMultipleKeys: jest.fn().mockResolvedValue(undefined),
  setWithTags: jest.fn().mockResolvedValue(undefined),
  invalidateByTag: jest.fn().mockResolvedValue(undefined),
  withLock: jest.fn((key, fn) => fn()),
  publishCacheInvalidation: jest.fn().mockResolvedValue(undefined),
  subscribeToCacheInvalidation: jest.fn(),
  getRedisHealth: jest.fn().mockResolvedValue({ status: 'healthy', latencyMs: 1, mode: 'single' }),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Firebase not used in this project - mock removed

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    ul: 'ul',
    li: 'li',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
  },
  AnimatePresence: ({ children }) => children,
}))

// Mock React Hot Toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => null,
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock File API
global.File = class MockFile {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks
    this.name = filename
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
}

// Mock FileReader
global.FileReader = class MockFileReader {
  constructor() {
    this.result = null
    this.error = null
    this.readyState = 0
    this.onload = null
    this.onerror = null
    this.onloadend = null
  }

  readAsDataURL(file) {
    this.readyState = 2
    this.result = `data:${file.type};base64,mockbase64`
    if (this.onload) this.onload({ target: this })
  }

  readAsText(file) {
    this.readyState = 2
    this.result = 'mock file content'
    if (this.onload) this.onload({ target: this })
  }
}

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes?.('Warning: ReactDOM.render')) return
  if (args[0]?.includes?.('Warning: React.createElement')) return
  originalConsoleWarn.apply(console, args)
}