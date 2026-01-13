import 'server-only'
import Redis, { Cluster } from 'ioredis'

// =============================================================================
// Redis Hyperscale Configuration
// Supports both single node (dev) and cluster mode (production)
// Target: 100,000+ ops/s with automatic failover
// =============================================================================

interface RedisConfig {
    mode: 'single' | 'cluster' | 'sentinel'
    nodes?: { host: string; port: number }[]
    sentinels?: { host: string; port: number }[]
    sentinelMasterName?: string
    maxRetries: number
    retryDelayMs: number
    connectionPoolSize: number
    enableOfflineQueue: boolean
}

const getRedisConfig = (): RedisConfig => {
    const mode = (process.env.REDIS_MODE || 'single') as 'single' | 'cluster' | 'sentinel'

    return {
        mode,
        nodes: process.env.REDIS_CLUSTER_NODES
            ? JSON.parse(process.env.REDIS_CLUSTER_NODES)
            : [{ host: 'localhost', port: 6379 }],
        sentinels: process.env.REDIS_SENTINELS
            ? JSON.parse(process.env.REDIS_SENTINELS)
            : undefined,
        sentinelMasterName: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
        // 100,000 CCU 기준: 재시도 횟수 증가 (3 → 5)
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '5'),
        // 100,000 CCU 기준: 재시도 딜레이 단축 (100ms → 50ms)
        retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY || '50'),
        // 100,000 CCU 기준: 연결 풀 크기 증가 (10 → 100)
        connectionPoolSize: parseInt(process.env.REDIS_POOL_SIZE || '100'),
        enableOfflineQueue: process.env.REDIS_OFFLINE_QUEUE !== 'false'
    }
}

const isDev = process.env.NODE_ENV === 'development'

const createRedisClient = (): Redis | Cluster => {
    const config = getRedisConfig()

    // CVE-CB-005: Development-only logging for Redis
    // 100,000 CCU 최적화: 타임아웃 단축, 재시도 전략 강화
    const commonOptions = {
        maxRetriesPerRequest: config.maxRetries,
        retryStrategy: (times: number) => {
            if (times > config.maxRetries) {
                if (isDev) {
                    console.error(`[DEV] Redis: Max retries exceeded`)
                }
                return null
            }
            // Exponential backoff with jitter for better load distribution
            const baseDelay = Math.min(times * config.retryDelayMs, 2000)
            const jitter = Math.random() * 100
            return baseDelay + jitter
        },
        enableOfflineQueue: config.enableOfflineQueue,
        lazyConnect: true,
        // 100,000 CCU 기준: 연결 타임아웃 단축 (10s → 5s)
        connectTimeout: 5000,
        // 100,000 CCU 기준: 명령 타임아웃 단축 (5s → 3s)
        commandTimeout: 3000,
        // Keep-alive for connection reuse
        keepAlive: 30000,
        // TCP no delay for faster response
        noDelay: true,
        // Auto-reconnect settings
        reconnectOnError: (err: Error) => {
            const targetError = 'READONLY'
            if (err.message.includes(targetError)) {
                return true
            }
            return false
        }
    }

    // Cluster Mode (Production - 100K+ users)
    if (config.mode === 'cluster' && config.nodes) {
        // CVE-CB-005: Development-only startup logging
        if (isDev) {
            console.log('[DEV] Redis: Initializing Cluster mode...')
        }
        return new Cluster(config.nodes, {
            ...commonOptions,
            scaleReads: 'slave', // Read from replicas for better distribution
            redisOptions: {
                password: process.env.REDIS_PASSWORD || undefined,
                tls: process.env.REDIS_TLS === 'true' ? {} : undefined
            },
            clusterRetryStrategy: (times: number) => {
                if (times > config.maxRetries) return null
                return Math.min(times * config.retryDelayMs, 3000)
            }
        })
    }

    // Sentinel Mode (High Availability)
    if (config.mode === 'sentinel' && config.sentinels) {
        if (isDev) {
            console.log('[DEV] Redis: Initializing Sentinel mode...')
        }
        return new Redis({
            sentinels: config.sentinels,
            name: config.sentinelMasterName,
            password: process.env.REDIS_PASSWORD || undefined,
            sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
            ...commonOptions
        })
    }

    // Single Node Mode (Development)
    if (isDev) {
        console.log('[DEV] Redis: Initializing Single node mode...')
    }
    if (process.env.REDIS_URL) {
        return new Redis(process.env.REDIS_URL, commonOptions)
    }

    return new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        ...commonOptions
    })
}

// Singleton with global preservation for Next.js hot reload
const globalForRedis = global as unknown as { redis: Redis | Cluster }
export const redis = globalForRedis.redis || createRedisClient()

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis
}

// =============================================================================
// Cache Key Patterns (Workspace-based sharding ready)
// Pattern: {module}:{workspaceId}:{entity}:{id}
// =============================================================================

export const CacheKeys = {
    // Dashboard & Stats
    dashboardStats: (workspaceId: string) => `dashboard:${workspaceId}:stats`,
    projectStats: (projectId: string) => `project:${projectId}:stats`,

    // HR Module
    hrStats: (workspaceId: string) => `hr:${workspaceId}:stats`,
    employees: (workspaceId: string) => `hr:${workspaceId}:employees`,
    employee: (workspaceId: string, employeeId: string) => `hr:${workspaceId}:employee:${employeeId}`,

    // Attendance
    attendance: (userId: string) => `attendance:${userId}:today`,
    attendanceHistory: (userId: string) => `attendance:${userId}:history`,
    attendanceStats: (workspaceId: string) => `attendance:${workspaceId}:stats`,

    // Payroll
    payroll: (workspaceId: string) => `payroll:${workspaceId}:list`,
    payrollRecord: (recordId: string) => `payroll:record:${recordId}`,
    payrollSummary: (workspaceId: string, year: string) => `payroll:${workspaceId}:summary:${year}`,

    // Projects & Tasks
    projectTasks: (projectId: string) => `project:${projectId}:tasks`,
    task: (taskId: string) => `task:${taskId}`,

    // Workspace
    workspaceMembers: (workspaceId: string) => `workspace:${workspaceId}:members`,
    workspaceSettings: (workspaceId: string) => `workspace:${workspaceId}:settings`,

    // User Sessions
    userSession: (userId: string) => `session:${userId}`,
    userPermissions: (userId: string, workspaceId: string) => `permissions:${userId}:${workspaceId}`
}

// =============================================================================
// Cache TTL Constants (in seconds)
// =============================================================================

export const CacheTTL = {
    // Short-lived (real-time data)
    SHORT: 60,           // 1 minute
    ATTENDANCE: 60,      // 1 minute (real-time check-in status)

    // Medium-lived (frequently updated)
    MEDIUM: 300,         // 5 minutes
    DASHBOARD: 300,      // 5 minutes
    TASKS: 300,          // 5 minutes

    // Long-lived (infrequently updated)
    LONG: 3600,          // 1 hour
    HR_STATS: 3600,      // 1 hour
    EMPLOYEES: 3600,     // 1 hour
    PAYROLL: 3600,       // 1 hour

    // Very long-lived (static data)
    EXTENDED: 86400,     // 24 hours
    SETTINGS: 86400,     // 24 hours
    PERMISSIONS: 86400   // 24 hours
}

// =============================================================================
// Core Cache Operations
// =============================================================================

/**
 * Get or Set cache with automatic fetching
 * Supports graceful fallback on Redis failure
 */
export async function getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM
): Promise<T> {
    try {
        const cached = await redis.get(key)
        if (cached) {
            return JSON.parse(cached)
        }

        const data = await fetcher()

        if (data !== null && data !== undefined) {
            // Non-blocking cache set - CVE-CB-005: Suppress error logging in production
            redis.setex(key, ttl, JSON.stringify(data)).catch(() => {
                // Silent fail - Redis errors handled gracefully
            })
        }

        return data
    } catch {
        // CVE-CB-005: Silent fallback - Redis errors handled gracefully
        return fetcher()
    }
}

/**
 * Multi-key get for batch operations
 * Reduces network round trips
 */
export async function mGetOrSet<T>(
    keys: string[],
    fetcher: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttl: number = CacheTTL.MEDIUM
): Promise<Map<string, T>> {
    const result = new Map<string, T>()

    try {
        const cached = await redis.mget(...keys)
        const missingKeys: string[] = []

        keys.forEach((key, index) => {
            if (cached[index]) {
                result.set(key, JSON.parse(cached[index] as string))
            } else {
                missingKeys.push(key)
            }
        })

        if (missingKeys.length > 0) {
            const fetchedData = await fetcher(missingKeys)

            // Pipeline for batch write - CVE-CB-005: Silent fail
            const pipeline = redis.pipeline()
            fetchedData.forEach((value, key) => {
                result.set(key, value)
                pipeline.setex(key, ttl, JSON.stringify(value))
            })

            pipeline.exec().catch(() => {
                // Silent fail - Redis errors handled gracefully
            })
        }

        return result
    } catch {
        // CVE-CB-005: Silent fallback
        return fetcher(keys)
    }
}

/**
 * Invalidate cache by exact key
 */
// CVE-CB-005: Silent fail for cache invalidation
export async function invalidateCache(key: string): Promise<void> {
    try {
        await redis.del(key)
    } catch {
        // Silent fail - Redis errors handled gracefully
    }
}

/**
 * Invalidate cache by pattern (use sparingly - expensive operation)
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
    try {
        // Use SCAN for production safety (non-blocking)
        let cursor = '0'
        const keysToDelete: string[] = []

        do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = newCursor
            keysToDelete.push(...keys)
        } while (cursor !== '0')

        if (keysToDelete.length > 0) {
            // Delete in batches to avoid blocking
            const batchSize = 100
            for (let i = 0; i < keysToDelete.length; i += batchSize) {
                const batch = keysToDelete.slice(i, i + batchSize)
                await redis.del(...batch)
            }
        }
    } catch {
        // CVE-CB-005: Silent fail for pattern invalidation
    }
}

/**
 * Invalidate multiple specific keys at once
 */
// CVE-CB-005: Silent fail for multi-key invalidation
export async function invalidateMultipleKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return

    try {
        await redis.del(...keys)
    } catch {
        // Silent fail - Redis errors handled gracefully
    }
}

// =============================================================================
// Advanced Cache Operations
// =============================================================================

/**
 * Set cache with tags for group invalidation
 */
export async function setWithTags<T>(
    key: string,
    value: T,
    tags: string[],
    ttl: number = CacheTTL.MEDIUM
): Promise<void> {
    try {
        const pipeline = redis.pipeline()

        // Set the actual value
        pipeline.setex(key, ttl, JSON.stringify(value))

        // Add key to tag sets
        tags.forEach(tag => {
            pipeline.sadd(`tag:${tag}`, key)
            pipeline.expire(`tag:${tag}`, ttl + 3600) // Tags live longer than values
        })

        await pipeline.exec()
    } catch {
        // CVE-CB-005: Silent fail for setWithTags
    }
}

/**
 * Invalidate all keys associated with a tag
 */
// CVE-CB-005: Silent fail for tag invalidation
export async function invalidateByTag(tag: string): Promise<void> {
    try {
        const keys = await redis.smembers(`tag:${tag}`)
        if (keys.length > 0) {
            await redis.del(...keys, `tag:${tag}`)
        }
    } catch {
        // Silent fail - Redis errors handled gracefully
    }
}

/**
 * Distributed lock for preventing cache stampede
 */
export async function withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options: { ttlMs?: number; retries?: number; retryDelayMs?: number } = {}
): Promise<T | null> {
    const { ttlMs = 10000, retries = 3, retryDelayMs = 100 } = options
    const lockValue = Date.now().toString()

    for (let attempt = 0; attempt < retries; attempt++) {
        // Try to acquire lock
        const acquired = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX')

        if (acquired === 'OK') {
            try {
                return await fn()
            } finally {
                // Release lock only if we still own it
                const currentValue = await redis.get(lockKey)
                if (currentValue === lockValue) {
                    await redis.del(lockKey)
                }
            }
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)))
    }

    // CVE-CB-005: Silent fail for lock acquisition
    return null
}

// =============================================================================
// Pub/Sub for Real-time Cache Invalidation
// =============================================================================

const CACHE_INVALIDATION_CHANNEL = 'cache:invalidation'

/**
 * Publish cache invalidation event (for multi-node setup)
 */
// CVE-CB-005: Silent fail for cache invalidation publish
export async function publishCacheInvalidation(keys: string[]): Promise<void> {
    try {
        await redis.publish(CACHE_INVALIDATION_CHANNEL, JSON.stringify({ keys, timestamp: Date.now() }))
    } catch {
        // Silent fail - Redis errors handled gracefully
    }
}

/**
 * Subscribe to cache invalidation events
 */
// CVE-CB-005: Silent fail for subscription errors
export function subscribeToCacheInvalidation(onInvalidate: (keys: string[]) => void): void {
    const subscriber = redis.duplicate()

    subscriber.subscribe(CACHE_INVALIDATION_CHANNEL).then(() => {
        subscriber.on('message', (channel, message) => {
            if (channel === CACHE_INVALIDATION_CHANNEL) {
                try {
                    const { keys } = JSON.parse(message)
                    onInvalidate(keys)
                } catch {
                    // Silent fail - message parse errors handled gracefully
                }
            }
        })
    }).catch(() => {
        // Silent fail - subscription errors handled gracefully
    })
}

// =============================================================================
// Health Check & Metrics
// =============================================================================

export async function getRedisHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    latencyMs: number
    mode: string
    info?: Record<string, string>
}> {
    const start = Date.now()

    try {
        await redis.ping()
        const latencyMs = Date.now() - start

        const info = await redis.info('server')
        const infoMap: Record<string, string> = {}
        info.split('\r\n').forEach(line => {
            const [key, value] = line.split(':')
            if (key && value) infoMap[key] = value
        })

        return {
            status: latencyMs < 100 ? 'healthy' : 'degraded',
            latencyMs,
            mode: getRedisConfig().mode,
            info: {
                version: infoMap.redis_version,
                uptime: infoMap.uptime_in_seconds,
                connected_clients: infoMap.connected_clients
            }
        }
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            mode: getRedisConfig().mode
        }
    }
}

// =============================================================================
// Backward Compatibility (legacy exports)
// =============================================================================

// Legacy function for backward compatibility
export { invalidateCachePattern as invalidateCache_legacy }

// =============================================================================
// API Response Caching Helpers
// =============================================================================

/**
 * Cache API response with automatic JSON serialization
 * Perfect for GET endpoints that return lists or objects
 */
export async function cachedApiResponse<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options: {
        ttl?: number
        tags?: string[]
        forceRefresh?: boolean
    } = {}
): Promise<T> {
    const { ttl = CacheTTL.MEDIUM, tags, forceRefresh = false } = options

    // Force refresh bypasses cache
    if (forceRefresh) {
        const data = await fetcher()
        if (tags && tags.length > 0) {
            await setWithTags(cacheKey, data, tags, ttl)
        } else {
            await redis.setex(cacheKey, ttl, JSON.stringify(data)).catch(() => {})
        }
        return data
    }

    // Use getOrSet for normal flow
    if (tags && tags.length > 0) {
        try {
            const cached = await redis.get(cacheKey)
            if (cached) {
                return JSON.parse(cached)
            }

            const data = await fetcher()
            await setWithTags(cacheKey, data, tags, ttl)
            return data
        } catch {
            return fetcher()
        }
    }

    return getOrSet(cacheKey, fetcher, ttl)
}

/**
 * Workspace-scoped cache invalidation
 * Invalidates all cache keys related to a workspace
 */
export async function invalidateWorkspaceCache(
    workspaceId: string,
    modules: ('dashboard' | 'hr' | 'attendance' | 'payroll' | 'project' | 'all')[] = ['all']
): Promise<void> {
    const keysToInvalidate: string[] = []

    if (modules.includes('all') || modules.includes('dashboard')) {
        keysToInvalidate.push(CacheKeys.dashboardStats(workspaceId))
    }
    if (modules.includes('all') || modules.includes('hr')) {
        keysToInvalidate.push(CacheKeys.hrStats(workspaceId))
        keysToInvalidate.push(CacheKeys.employees(workspaceId))
    }
    if (modules.includes('all') || modules.includes('attendance')) {
        keysToInvalidate.push(CacheKeys.attendanceStats(workspaceId))
    }
    if (modules.includes('all') || modules.includes('payroll')) {
        keysToInvalidate.push(CacheKeys.payroll(workspaceId))
    }

    if (keysToInvalidate.length > 0) {
        await invalidateMultipleKeys(keysToInvalidate)
    }
}

/**
 * Project-scoped cache invalidation
 */
export async function invalidateProjectCache(projectId: string): Promise<void> {
    await invalidateMultipleKeys([
        CacheKeys.projectStats(projectId),
        CacheKeys.projectTasks(projectId)
    ])
}

/**
 * User-scoped cache invalidation
 */
export async function invalidateUserCache(userId: string): Promise<void> {
    await invalidateMultipleKeys([
        CacheKeys.attendance(userId),
        CacheKeys.attendanceHistory(userId),
        CacheKeys.userSession(userId)
    ])
}
