# CLAUDE.md v3.2.7 - CodeB Project Rules

## Critical Rules

### 1. NEVER Run Dangerous Commands Directly

```bash
# 절대 금지 (Hooks가 차단함)
podman rm -f <container>       # 직접 컨테이너 삭제
podman volume rm <volume>      # 직접 볼륨 삭제
docker-compose down -v         # 볼륨 포함 삭제
rm -rf /opt/codeb/projects/*   # 프로젝트 폴더 삭제
```

### 2. ALWAYS Use CLI Commands

```bash
# 올바른 방법
we workflow init <project>     # 프로젝트 초기화
we deploy <project>            # 배포
we workflow stop <project>     # 서비스 중지
we workflow scan <project>     # 상태 확인
we ssot sync                   # 서버 데이터 동기화
```

### 3. Server Access Control

**⚠️ 직접 SSH 접속 금지 (Admin 제외)**

팀원/AI 코딩 도구는 SSH 직접 접속 없이 MCP API로만 서버 작업합니다.

```bash
# ❌ 절대 금지 (팀원/AI)
ssh root@158.247.203.55
ssh root@app.codeb.kr

# ✅ 올바른 방법 - we CLI 명령어 사용
we deploy myapp           # MCP API로 배포
we env restore myapp      # MCP API로 ENV 복구
we health                 # MCP API로 상태 확인
```

**서버 정보 (MCP로만 접근):**
- 158.247.203.55 (App - app.codeb.kr)
- 141.164.42.213 (Streaming - ws.codeb.kr)
- 64.176.226.119 (Storage - db.codeb.kr)
- 141.164.37.63 (Backup - backup.codeb.kr)

> Admin만 SSH 직접 접속 가능. 팀원은 `we` CLI + MCP API 사용.

### 4. Environment File Protection

- NEVER overwrite existing .env files without backup
- Protected variables: DATABASE_URL, REDIS_URL, POSTGRES_*

### 5. ENV Backup System (Critical)

**모든 ENV 파일은 백업 서버에 자동 보관됩니다.**

```
백업 서버: backup.codeb.kr (141.164.37.63)
백업 경로: /opt/codeb/env-backup/{project}/{environment}/
```

**백업 파일 구조:**
- `master.env` - 최초 생성 시 저장 (절대 변경 안됨, 복구 기준)
- `current.env` - 최신 버전
- `{timestamp}.env` - 변경 이력

**규칙:**
1. ❌ ENV 파일 직접 수정/삭제 금지
2. ✅ 항상 `we env` 명령어 사용
3. ✅ 문제 발생 시 `master.env`에서 복구

**ENV 명령어:**
```bash
we env scan <project>              # 서버/로컬 ENV 비교
we env backups <project>           # 백업 목록 조회
we env restore <project> --version master   # master에서 복구 (권장)
we env restore <project> --version current  # 최신 백업에서 복구
we env pull <project>              # 서버에서 로컬로 가져오기
```

---

## Server Infrastructure

### 서버 역할 및 IP 매핑

| 역할 | IP | 도메인 | 주요 서비스 |
|------|-----|--------|------------|
| **App** | 158.247.203.55 | app.codeb.kr | Next.js 앱, Dashboard, PowerDNS |
| **Streaming** | 141.164.42.213 | ws.codeb.kr, streaming.codeb.kr | **Centrifugo** (WebSocket) |
| **Storage** | 64.176.226.119 | db.codeb.kr, storage.codeb.kr | PostgreSQL, Redis (공유) |
| **Backup** | 141.164.37.63 | backup.codeb.kr | 백업, 모니터링 |

### 네임서버 (PowerDNS)
- n1.codeb.kr → 158.247.203.55 (Primary NS)
- n2.codeb.kr → 158.247.203.55 (Secondary NS)

### 포트 할당 규칙

| 서비스 | 포트 | 서버 |
|--------|------|------|
| PostgreSQL | 5432 | Storage (n3) |
| Redis | 6379 | Storage (n3) |
| Centrifugo | 8000 | Streaming (n2) |
| MCP HTTP API | 9101 | App (n1) |
| 스테이징 앱 | 3000-3499 | App (n1) |
| 프로덕션 앱 | 4000-4499 | App (n1) |
| Preview 앱 | 5000-5999 | App (n1) |

### 상세 포트 범위 (port-utils.js)

| 환경 | App Port | DB Port | Redis Port |
|------|----------|---------|------------|
| staging | 3000-3499 | 5432-5449 | 6379-6399 |
| production | 4000-4499 | 5450-5469 | 6400-6419 |
| preview | 5000-5999 | 5470-5499 | 6420-6439 |

---

## Real-time Communication (WebSocket)

### ❌ NEVER Use Socket.IO

```javascript
// 절대 금지 - Socket.IO 사용 금지
import { Server } from 'socket.io';
import { io } from 'socket.io-client';
```

### ✅ ALWAYS Use Centrifugo

Centrifugo는 Go로 작성된 고성능 실시간 메시징 서버입니다.

**Centrifugo 서버 정보:**
- Host: `ws.codeb.kr` (141.164.42.213)
- Port: `8000`
- WebSocket: `wss://ws.codeb.kr/connection/websocket`
- HTTP API: `http://ws.codeb.kr:8000/api`

**클라이언트 연결 (JavaScript):**
```javascript
import { Centrifuge } from 'centrifuge';

const centrifuge = new Centrifuge('wss://ws.codeb.kr/connection/websocket', {
  token: await getConnectionToken()  // JWT 토큰
});

// 채널 구독
const sub = centrifuge.newSubscription('chat:room123');
sub.on('publication', (ctx) => {
  console.log('메시지:', ctx.data);
});
sub.subscribe();

centrifuge.connect();
```

**서버에서 메시지 발행 (Node.js):**
```javascript
// 백엔드에서 Centrifugo API로 메시지 발행
const response = await fetch('http://ws.codeb.kr:8000/api/publish', {
  method: 'POST',
  headers: {
    'Authorization': `apikey ${CENTRIFUGO_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: 'chat:room123',
    data: { message: 'Hello!', user: 'john' }
  })
});
```

**ENV 설정:**
```bash
# Centrifugo 설정 (Socket.IO 대신 사용)
CENTRIFUGO_URL=wss://ws.codeb.kr/connection/websocket
CENTRIFUGO_API_URL=http://ws.codeb.kr:8000/api
CENTRIFUGO_API_KEY=pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G
CENTRIFUGO_SECRET=of0KuRFjjzhq5LlBURCuKqzTUAA08hwL
```

---

## ENV Auto-Generation

`we workflow init` 실행 시 자동 생성되는 환경 변수:

```bash
# 자동 생성 항목
NODE_ENV=production
PORT=3000

# PostgreSQL (Storage 서버 연결)
DATABASE_URL=postgresql://postgres:password@db.codeb.kr:5432/myapp?schema=public

# Redis (Storage 서버 연결)
REDIS_URL=redis://db.codeb.kr:6379/0
REDIS_PREFIX=myapp:

# Centrifugo (Streaming 서버 연결)
CENTRIFUGO_URL=wss://ws.codeb.kr/connection/websocket
CENTRIFUGO_API_URL=http://ws.codeb.kr:8000/api
CENTRIFUGO_API_KEY=pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G
CENTRIFUGO_SECRET=of0KuRFjjzhq5LlBURCuKqzTUAA08hwL
```

---

## Quick Reference

```bash
# 프로젝트 초기화
we workflow init myapp --type nextjs --database --redis

# 서버 상태 확인
we ssot status
we ssot projects
we workflow scan myapp

# 배포
we deploy myapp --environment staging

# 도메인 설정
we domain setup myapp.codeb.dev --ssl
```

## Permission Model

- **Admin**: SSH + deploy + server settings
- **Developer**: Git Push only → GitHub Actions → auto deploy

---

## Deployment Method (v3.2.3+)

### ✅ MCP API (기본값, 권장)

**모든 배포는 MCP API를 통해 진행합니다.**

```yaml
# GitHub Actions - deploy.yml
# Deploy: API (Developer - CODEB_API_KEY)

- name: Deploy via CodeB API
  run: |
    curl -sf -X POST "https://app.codeb.kr/api/deploy" \
      -H "Authorization: Bearer ${{ secrets.CODEB_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"project": "myapp", "environment": "production", ...}'
```

**필요한 GitHub Secrets:**
- `CODEB_API_KEY`: MCP API 배포 키 (app.codeb.kr/settings에서 발급)
- `GHCR_PAT`: GitHub Container Registry 토큰

### ❌ SSH Deploy (Admin 전용)

SSH 배포는 **Admin만** 사용 가능합니다. 일반 개발자는 사용하지 마세요.

```bash
# SSH 배포가 감지되면 경고 표시
we workflow scan myapp
# ⚠️ SSH deploy detected (Admin only) - run "we workflow migrate" for MCP API
```

**배포 플로우:**
```
Developer: Git Push → GitHub Actions → Build → ghcr.io → MCP API → Deploy
Admin:     Git Push → GitHub Actions → Build → ghcr.io → SSH Direct → Deploy
```

### 마이그레이션

기존 SSH 배포 프로젝트를 MCP API로 전환:

```bash
we workflow migrate myapp
# 1. GitHub Actions를 MCP API 방식으로 업데이트
# 2. CODEB_API_KEY 시크릿 등록 안내
# 3. SSH 시크릿 제거 안내 (선택)
```

---

## Version Management (Critical)

**버전은 반드시 한 곳에서 관리합니다.**

```
codeb-server/
├── VERSION           # 단일 진실 소스 (Single Source of Truth)
├── cli/package.json  # VERSION 파일 참조
└── api/package.json  # VERSION 파일 참조
```

**버전 업데이트 방법:**
```bash
# 1. VERSION 파일 업데이트 후 모든 package.json 동기화
./scripts/sync-version.sh 3.2.3

# 2. CLI 배포
cd cli && npm publish

# 3. API 서버 배포
scp api/* root@158.247.203.55:/opt/codeb/mcp-api/
ssh root@158.247.203.55 "pkill -f 'node.*mcp-http-api'; cd /opt/codeb/mcp-api && nohup node mcp-http-api.js &"

# 4. 커밋
git add . && git commit -m "chore: bump version to 3.2.3"
```

**금지 사항:**
- ❌ 개별 package.json 버전 직접 수정
- ❌ 하드코딩된 버전 문자열 사용
- ✅ VERSION 파일에서 읽어서 사용

---

## Blue-Green Slot Deployment (v3.2+)

**새로운 배포 방식 - Vercel 스타일 무중단 배포**

```
배포 흐름:
1. deploy → 비활성 Slot에 컨테이너 배포 (Preview URL 제공)
2. 테스트 후 promote → Caddy 설정만 변경 (무중단 트래픽 전환)
3. 이전 Slot은 48시간 Grace Period 후 정리
4. 문제 시 rollback → 즉시 이전 Slot으로 전환
```

**Slot 상태:**
| 상태 | 설명 |
|------|------|
| empty | 컨테이너 없음 |
| deployed | 배포됨, 트래픽 미수신 |
| active | 트래픽 수신 중 |
| grace-period | 이전 버전, 48시간 후 정리 |

**CLI 명령어:**
```bash
we deploy myapp                    # Blue-Green Slot 배포
we promote myapp                   # 트래픽 전환
we rollback myapp                  # 이전 버전으로 롤백
we slot status myapp               # Slot 상태 확인
we workflow scan myapp             # 워크플로우 분석
```

**API 엔드포인트:**
```
Base URL: https://api.codeb.kr/api
Fallback: http://158.247.203.55:9101/api

Authentication: X-API-Key: codeb_{role}_{token}
Roles: admin (전체), dev (배포), view (조회)
```

**포트 할당:**
```
Staging:    3000~3499 (Blue: basePort, Green: basePort+1)
Production: 4000~4499 (Blue: basePort, Green: basePort+1)
Preview:    5000~5999 (Blue: basePort, Green: basePort+1)
```

---

## Port & Registry Management

### 레지스트리 파일 (서버)

| 파일 | 경로 | 역할 |
|------|------|------|
| ssot.json | `/opt/codeb/registry/ssot.json` | 단일 진실 소스 (포트/도메인/프로젝트) |
| slots.json | `/opt/codeb/registry/slots.json` | Blue-Green Slot 상태 |
| api-keys.json | `/opt/codeb/config/api-keys.json` | API 키 관리 |
| api-access.json | `/opt/codeb/logs/api-access.json` | API 접근 로그 |

### 포트 관리 CLI 파일

| 파일 | 역할 |
|------|------|
| `cli/src/commands/workflow/port-utils.js` | 포트 범위 정의, 스캔, 검증 |
| `cli/src/commands/workflow/registry.js` | SSOT ↔ Legacy 변환 |
| `cli/src/lib/ssot-client.js` | CLI에서 SSOT 접근 (30초 캐시) |

### 포트 관리 명령어

```bash
we ssot status                # SSOT 상태 확인
we ssot projects              # 등록된 프로젝트 목록
we ssot validate              # 무결성 검증
we ssot validate --fix        # 자동 수정
we ssot sync                  # 서버 상태와 동기화
we ssot sync --dry-run        # 변경 미리보기
```

---

## Monitoring System

### CLI 모니터링

```bash
we monitor --metrics cpu,memory,disk --interval 5
we health                     # 서버 헬스체크
we ssot status               # SSOT 상태
```

### API 모니터링 엔드포인트

```bash
# API 사용 통계 (7일)
curl -X POST https://api.codeb.kr/api/tool \
  -H "X-API-Key: codeb_admin_xxx" \
  -d '{"tool": "api_access_stats", "params": {"days": 7}}'

# 활성 사용자 (24시간)
curl -X POST https://api.codeb.kr/api/tool \
  -H "X-API-Key: codeb_admin_xxx" \
  -d '{"tool": "api_active_users", "params": {"hours": 24}}'

# 서버 헬스체크
curl -X POST https://api.codeb.kr/api/tool \
  -H "X-API-Key: codeb_view_xxx" \
  -d '{"tool": "full_health_check"}'

# Slot 상태
curl -X POST https://api.codeb.kr/api/tool \
  -H "X-API-Key: codeb_view_xxx" \
  -d '{"tool": "slot_list"}'
```
