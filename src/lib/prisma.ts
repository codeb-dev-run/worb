import { PrismaClient } from '@prisma/client'

// =============================================================================
// Prisma Hyperscale Configuration
// Supports connection pooling, read replicas, and query optimization
// Target: 1,000+ concurrent database connections
// =============================================================================

interface PrismaConfig {
    connectionLimit: number
    poolTimeout: number
    queryTimeout: number
    enableLogging: boolean
    useReadReplica: boolean
}

const getPrismaConfig = (): PrismaConfig => ({
    connectionLimit: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
    poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10'),
    queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000'),
    enableLogging: process.env.DATABASE_LOGGING === 'true',
    useReadReplica: !!process.env.DATABASE_REPLICA_URL
})

// =============================================================================
// Primary (Write) Client
// =============================================================================

const createPrismaClient = () => {
    const config = getPrismaConfig()

    return new PrismaClient({
        log: config.enableLogging
            ? [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' }
            ]
            : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    })
}

// =============================================================================
// Read Replica Client (Optional)
// Use for read-heavy operations to distribute load
// =============================================================================

const createReadReplicaClient = () => {
    const config = getPrismaConfig()

    if (!config.useReadReplica) {
        return null
    }

    return new PrismaClient({
        log: config.enableLogging ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_REPLICA_URL
            }
        }
    })
}

// =============================================================================
// Singleton Pattern for Next.js Hot Reload
// =============================================================================

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
    prismaReplica: PrismaClientSingleton | null | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
export const prismaReplica = globalForPrisma.prismaReplica ?? createReadReplicaClient()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
    globalForPrisma.prismaReplica = prismaReplica
}

// =============================================================================
// Query Helper Functions
// =============================================================================

/**
 * Get the appropriate client for read operations
 * Uses replica if available, otherwise falls back to primary
 */
export function getReadClient(): PrismaClient {
    return prismaReplica || prisma
}

/**
 * Get the primary client for write operations
 */
export function getWriteClient(): PrismaClient {
    return prisma
}

// =============================================================================
// Transaction Helper with Timeout
// =============================================================================

interface TransactionOptions {
    maxWait?: number  // Maximum time to wait for transaction slot
    timeout?: number  // Maximum transaction duration
    isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable'
}

/**
 * Execute operations in a transaction with configurable timeout
 */
export async function withTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options: TransactionOptions = {}
): Promise<T> {
    const {
        maxWait = 5000,
        timeout = 10000,
        isolationLevel = 'ReadCommitted'
    } = options

    return prisma.$transaction(fn, {
        maxWait,
        timeout,
        isolationLevel
    })
}

// =============================================================================
// Batch Operation Helpers
// =============================================================================

/**
 * Execute multiple independent queries in parallel
 * Significantly faster than sequential execution
 */
export async function parallelQueries<T extends Record<string, Promise<any>>>(
    queries: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
    const entries = Object.entries(queries)
    const results = await Promise.all(entries.map(([, promise]) => promise))

    return Object.fromEntries(
        entries.map(([key], index) => [key, results[index]])
    ) as { [K in keyof T]: Awaited<T[K]> }
}

/**
 * Batch create with chunking for large datasets
 * Prevents memory issues and timeout errors
 */
export async function batchCreate<T>(
    createFn: (data: T[]) => Promise<{ count: number }>,
    data: T[],
    batchSize: number = 100
): Promise<number> {
    let totalCount = 0

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const result = await createFn(batch)
        totalCount += result.count
    }

    return totalCount
}

/**
 * Batch update with chunking
 */
export async function batchUpdate<T extends { id: string }>(
    updateFn: (item: T) => Promise<any>,
    items: T[],
    concurrency: number = 10
): Promise<number> {
    let successCount = 0

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency)
        const results = await Promise.allSettled(batch.map(item => updateFn(item)))
        successCount += results.filter(r => r.status === 'fulfilled').length
    }

    return successCount
}

// =============================================================================
// Query Optimization Helpers
// =============================================================================

/**
 * Paginated query helper with cursor-based pagination
 * More efficient than offset pagination for large datasets
 */
export interface CursorPaginationOptions {
    cursor?: string
    take: number
    orderBy?: Record<string, 'asc' | 'desc'>
}

export interface CursorPaginatedResult<T> {
    items: T[]
    nextCursor: string | null
    hasMore: boolean
}

/**
 * Helper to build cursor pagination params
 */
export function buildCursorPagination(options: CursorPaginationOptions) {
    const { cursor, take, orderBy = { id: 'asc' } } = options

    return {
        take: take + 1, // Fetch one extra to check if there's more
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1 // Skip the cursor item
        }),
        orderBy
    }
}

/**
 * Process cursor pagination results
 */
export function processCursorResults<T extends { id: string }>(
    items: T[],
    take: number
): CursorPaginatedResult<T> {
    const hasMore = items.length > take
    const resultItems = hasMore ? items.slice(0, -1) : items
    const nextCursor = hasMore ? resultItems[resultItems.length - 1]?.id : null

    return {
        items: resultItems,
        nextCursor,
        hasMore
    }
}

// =============================================================================
// Connection Health Check
// =============================================================================

export async function checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    latencyMs: number
    replicaStatus?: 'healthy' | 'unhealthy'
}> {
    const start = Date.now()

    try {
        // Check primary
        await prisma.$queryRaw`SELECT 1`
        const latencyMs = Date.now() - start

        // Check replica if available
        let replicaStatus: 'healthy' | 'unhealthy' | undefined
        if (prismaReplica) {
            try {
                await prismaReplica.$queryRaw`SELECT 1`
                replicaStatus = 'healthy'
            } catch {
                replicaStatus = 'unhealthy'
            }
        }

        return {
            status: latencyMs < 100 ? 'healthy' : 'degraded',
            latencyMs,
            replicaStatus
        }
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: Date.now() - start
        }
    }
}

// =============================================================================
// Query Performance Logging
// =============================================================================

// CVE-CB-005: Query performance logging only in development
if (process.env.DATABASE_LOGGING === 'true' && process.env.NODE_ENV === 'development') {
    prisma.$on('query' as never, (e: any) => {
        const duration = e.duration
        if (duration > 1000) {
            console.warn(`[DEV] Slow query detected (${duration}ms)`)
        }
    })
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

// CVE-CB-005: Graceful shutdown with development-only logging
async function gracefulShutdown(signal?: string) {
    if (process.env.NODE_ENV === 'development' && signal) {
        console.log(`[DEV] Received ${signal}, closing database connections...`)
    }
    await prisma.$disconnect()
    if (prismaReplica) {
        await prismaReplica.$disconnect()
    }
    process.exit(0)
}

// Handle graceful shutdown - only register once using global flag
const globalWithShutdown = globalThis as typeof globalThis & {
    shutdownRegistered?: boolean
}

if (!globalWithShutdown.shutdownRegistered) {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    globalWithShutdown.shutdownRegistered = true
}
