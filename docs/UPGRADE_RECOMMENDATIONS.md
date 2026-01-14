# Project CMS - 100K CCU 업그레이드 권장사항

> **버전**: v1.0.0
> **분석일**: 2026-01-14
> **목표**: 동시접속자 100,000명 지원을 위한 최적화

---

## Executive Summary

현재 프로젝트는 약 **30-50K CCU** 처리 가능한 상태로, 100K CCU 달성을 위해 다음 영역의 개선이 필요합니다:

| 영역 | 현재 점수 | 목표 점수 | 주요 개선점 |
|------|----------|----------|------------|
| Database | 7/10 | 9/10 | 인덱스 추가, Read Replica |
| Caching | 9/10 | 10/10 | 클러스터 전환 |
| API | 7/10 | 9/10 | 결과 제한, 비동기화 |
| Real-time | 8/10 | 9/10 | 최적화 |

---

## P0: 즉시 적용 (1주 이내)

### 1. 누락 인덱스 추가

**파일:** `prisma/schema/07-attendance.prisma`

```prisma
model Attendance {
  // ... existing fields

  // 기존 인덱스
  @@index([userId, date])
  @@index([workspaceId, date])
  @@index([workspaceId, status])
  @@index([date, status])

  // ✅ 추가 필요 - 가장 빈번한 쿼리 패턴
  @@index([workspaceId, userId, date])
}
```

**파일:** `prisma/schema/18-messaging.prisma`

```prisma
model Message {
  // ... existing fields

  // ✅ 추가 필요 - 채팅 메시지 조회 최적화
  @@index([channelId, createdAt])
}
```

**마이그레이션 명령:**
```bash
npx prisma migrate dev --name add_100k_ccu_indexes
```

**예상 효과:** 해당 쿼리 90% 성능 개선

---

### 2. 결과 제한 (take) 의무화

**수정 대상 파일들:**

```typescript
// src/app/api/projects/[id]/tasks/route.ts
// Before
const tasks = await prisma.task.findMany({
  where: { projectId }
})

// After ✅
const tasks = await prisma.task.findMany({
  where: { projectId },
  take: 100,  // 필수
  orderBy: { createdAt: 'desc' }
})
```

**적용 대상 API:**
- `/api/projects/[id]/tasks`
- `/api/qa`
- `/api/board`
- `/api/messages`
- `/api/activities`

**예상 효과:** 메모리 60% 절감, 응답 시간 50% 단축

---

### 3. 동기 캐시 무효화 → 비동기

**파일:** `src/app/api/payroll/route.ts`

```typescript
// Before
await invalidateCache(`payroll:${workspaceId}:list`)
return NextResponse.json(result)

// After ✅
invalidateCache(`payroll:${workspaceId}:list`)  // await 제거
return NextResponse.json(result)
```

**적용 대상:**
- `/api/payroll/*`
- `/api/attendance/*`
- `/api/leave/*`
- `/api/projects/*`

**예상 효과:** 응답 시간 50-100ms 단축

---

## P1: 단기 적용 (1개월 이내)

### 4. PgBouncer 도입

**docker-compose.yml 추가:**

```yaml
services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DATABASE_URL: "postgres://user:pass@db:5432/cms"
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 100
      MIN_POOL_SIZE: 20
    ports:
      - "6432:6432"
```

**환경 변수 변경:**
```env
# Before
DATABASE_URL="postgres://db.codeb.kr:5432/cms"

# After
DATABASE_URL="postgres://pgbouncer:6432/cms"
DATABASE_POOL_SIZE=500  # PgBouncer와 함께 증가
```

**예상 효과:** 연결 풀 200 → 500+ 확장

---

### 5. Read Replica 활성화

**환경 변수:**
```env
DATABASE_URL="postgres://primary.db.codeb.kr:5432/cms"
DATABASE_REPLICA_URL="postgres://replica.db.codeb.kr:5432/cms"
```

**코드 패턴:**
```typescript
// 읽기 전용 쿼리에 readClient 사용
import { getReadClient } from '@/lib/prisma'

export async function GET(request: Request) {
  const readClient = getReadClient()  // ✅ Read Replica 사용

  const data = await readClient.employee.findMany({
    where: { workspaceId }
  })

  return NextResponse.json(data)
}
```

**적용 대상 API (읽기 전용):**
- `GET /api/dashboard/*`
- `GET /api/hr/stats`
- `GET /api/employees`
- `GET /api/projects` (목록)
- `GET /api/attendance/history`

**예상 효과:** 읽기 부하 70% 분산

---

### 6. 트랜잭션 일관성 강화

**파일:** `src/app/api/employees/[id]/route.ts`

```typescript
// Before - 트랜잭션 없음
await prisma.employee.update({ where: { id }, data: {...} })
await prisma.employeeEducation.deleteMany({ where: { employeeId: id } })
await prisma.employeeEducation.createMany({ data: educations })

// After ✅ - 트랜잭션으로 감싸기
import { withTransaction } from '@/lib/prisma'

await withTransaction(async (tx) => {
  await tx.employee.update({ where: { id }, data: {...} })
  await tx.employeeEducation.deleteMany({ where: { employeeId: id } })
  await tx.employeeEducation.createMany({ data: educations })
})
```

**적용 대상:**
- 직원 프로필 업데이트
- 급여 계산 및 저장
- 프로젝트 멤버 일괄 변경
- 태스크 일괄 이동

**예상 효과:** 데이터 정합성 100% 보장

---

### 7. N+1 쿼리 최적화

**파일:** `src/app/api/projects/[id]/members/route.ts`

```typescript
// Before - Deep includes (N+1 위험)
const members = await prisma.projectMember.findMany({
  where: { projectId },
  include: {
    user: {
      include: {
        employeeProfiles: true,
        teamMemberships: true
      }
    }
  }
})

// After ✅ - Selective fields
const members = await prisma.projectMember.findMany({
  where: { projectId },
  select: {
    id: true,
    role: true,
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

// 필요한 경우 별도 쿼리
if (includeDetails) {
  const userIds = members.map(m => m.user.id)
  const employees = await prisma.employee.findMany({
    where: { userId: { in: userIds } }
  })
}
```

**예상 효과:** 쿼리 시간 80% 감소

---

## P2: 중기 적용 (3개월 이내)

### 8. Redis Cluster 전환

**환경 변수:**
```env
REDIS_MODE=cluster
REDIS_CLUSTER_NODES='[{"host":"redis-0","port":6379},{"host":"redis-1","port":6379},{"host":"redis-2","port":6379}]'
REDIS_POOL_SIZE=200
```

**Kubernetes 배포 예시:**
```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: cms-redis-cluster
spec:
  clusterSize: 3
  clusterVersion: v7
  persistenceEnabled: true
  resources:
    requests:
      cpu: 200m
      memory: 2Gi
    limits:
      cpu: 1000m
      memory: 8Gi
```

**예상 효과:** 캐시 HA 확보, 100K+ ops/s 지원

---

### 9. Rate Limiting 도입

**새 파일:** `src/middleware/rate-limit.ts`

```typescript
import { redis } from '@/lib/redis'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'api': { windowMs: 60000, maxRequests: 100 },
  'auth': { windowMs: 60000, maxRequests: 10 },
  'upload': { windowMs: 60000, maxRequests: 20 },
}

export async function rateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMITS = 'api'
): Promise<{ allowed: boolean; remaining: number }> {
  const config = RATE_LIMITS[type]
  const key = `ratelimit:${type}:${identifier}`

  const pipeline = redis.pipeline()
  pipeline.incr(key)
  pipeline.pttl(key)

  const [[, count], [, ttl]] = await pipeline.exec() as [[null, number], [null, number]]

  if (ttl === -1) {
    await redis.pexpire(key, config.windowMs)
  }

  const allowed = count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - count)

  return { allowed, remaining }
}
```

**적용 예시:**
```typescript
// src/app/api/auth/login/route.ts
import { rateLimit } from '@/middleware/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { allowed, remaining } = await rateLimit(ip, 'auth')

  if (!allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'X-RateLimit-Remaining': remaining.toString() }
    })
  }

  // ... login logic
}
```

**예상 효과:** API 보호, DDoS 방어

---

### 10. Query 성능 모니터링 대시보드

**새 파일:** `src/lib/query-monitor.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface QueryMetric {
  query: string
  duration: number
  timestamp: number
}

const SLOW_QUERY_THRESHOLD = 500 // ms

export async function logSlowQuery(metric: QueryMetric) {
  if (metric.duration > SLOW_QUERY_THRESHOLD) {
    await redis.zadd(
      'slow_queries',
      metric.duration,
      JSON.stringify({
        query: metric.query.substring(0, 200),
        duration: metric.duration,
        timestamp: metric.timestamp
      })
    )

    // 최근 1000개만 유지
    await redis.zremrangebyrank('slow_queries', 0, -1001)
  }
}

export async function getSlowQueries(limit: number = 100) {
  const queries = await redis.zrevrange('slow_queries', 0, limit - 1, 'WITHSCORES')
  return queries.map((q, i) => i % 2 === 0 ? JSON.parse(q) : null).filter(Boolean)
}
```

**Prisma 이벤트 연동:**
```typescript
// src/lib/prisma.ts
prisma.$on('query', async (e) => {
  await logSlowQuery({
    query: e.query,
    duration: e.duration,
    timestamp: Date.now()
  })
})
```

**예상 효과:** 지속적 성능 최적화 가능

---

## 인프라 권장 사양

### Database (PostgreSQL 16)

| 환경 | vCPU | RAM | Storage | IOPS |
|------|------|-----|---------|------|
| 개발 | 2 | 4GB | 50GB | 3K |
| 스테이징 | 4 | 16GB | 100GB | 10K |
| 프로덕션 | 16+ | 64GB+ | 500GB+ | 20K+ |

**Read Replica:**
- 프로덕션: 2-3대 권장
- 지역: 동일 리전 (지연 최소화)

### Redis

| 환경 | 구성 | RAM | 노드 수 |
|------|------|-----|--------|
| 개발 | Single | 1GB | 1 |
| 스테이징 | Sentinel | 4GB | 3 |
| 프로덕션 | Cluster | 16GB+ | 6 (3M+3R) |

### Application (Next.js)

| 환경 | vCPU | RAM | 인스턴스 |
|------|------|-----|----------|
| 개발 | 2 | 4GB | 1 |
| 스테이징 | 4 | 8GB | 2 |
| 프로덕션 | 8+ | 16GB | 4+ (Auto-scale) |

---

## 체크리스트

### P0 (1주)
- [ ] Attendance 복합 인덱스 추가
- [ ] Message 인덱스 추가
- [ ] API 결과 제한 (take) 적용
- [ ] 동기 캐시 무효화 → 비동기 변환

### P1 (1개월)
- [ ] PgBouncer 도입
- [ ] Read Replica 활성화
- [ ] 트랜잭션 일관성 강화
- [ ] N+1 쿼리 최적화

### P2 (3개월)
- [ ] Redis Cluster 전환
- [ ] Rate Limiting 도입
- [ ] Query 성능 모니터링 구축
- [ ] 부하 테스트 (10K → 50K → 100K)

---

## 예상 비용 (월간, AWS 기준)

| 항목 | 현재 | 100K CCU |
|------|------|----------|
| RDS (Primary) | $200 | $800 |
| RDS (Replica x2) | - | $1,200 |
| ElastiCache (Redis) | $50 | $600 |
| EC2 (App x4) | $200 | $800 |
| **Total** | **$450** | **$3,400** |

---

## 결론

100K CCU 달성을 위한 로드맵:

1. **Week 1-2:** P0 즉시 적용 (인덱스, 쿼리 최적화)
2. **Week 3-4:** 부하 테스트 (현재 → 50K CCU 검증)
3. **Month 2:** P1 적용 (PgBouncer, Read Replica)
4. **Month 3:** P2 적용 (Redis Cluster, Rate Limiting)
5. **Month 4:** 최종 부하 테스트 (100K CCU 검증)

**예상 완료일:** 적용 시작일 + 3개월

---

**작성자:** Claude Opus 4.5
**작성일:** 2026-01-14
