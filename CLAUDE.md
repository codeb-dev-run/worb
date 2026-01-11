# CLAUDE.md - CodeB Project Rules

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
| 프로덕션 앱 | 4000-4499 | App (n1) |
| 스테이징 앱 | 4500-4999 | App (n1) |
| 개발용 | 5000-5499 | 로컬 |

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
