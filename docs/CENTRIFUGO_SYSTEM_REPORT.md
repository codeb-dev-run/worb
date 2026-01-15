# Centrifugo 실시간 알림 시스템 분석 리포트

**작성일**: 2026-01-15
**프로젝트**: workb.net (project_cms)
**상태**: ✅ **해결 완료**

---

## 1. 인프라 구성 현황

### 1.1 4-Server Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CodeB 4-Server Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐         ┌─────────────────────┐                   │
│  │   App Server        │         │  Streaming Server   │                   │
│  │   158.247.203.55    │         │  141.164.42.213     │                   │
│  │                     │         │                     │                   │
│  │ • worb-production   │   DNS   │ • codeb-centrifugo  │                   │
│  │ • videopick-centro  │◄───────►│ • Caddy (ws.codeb)  │                   │
│  │ • codeb-api         │         │ • mediamtx          │                   │
│  │ • Caddy (workb.net) │         │                     │                   │
│  └─────────────────────┘         └─────────────────────┘                   │
│           │                               │                                 │
│           │                               │                                 │
│           ▼                               ▼                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐                   │
│  │   Storage Server    │         │   Backup Server     │                   │
│  │   64.176.226.119    │         │   141.164.37.63     │                   │
│  │                     │         │                     │                   │
│  │ • codeb-postgres    │         │ • node-exporter     │                   │
│  │ • codeb-redis       │         │                     │                   │
│  │ • minio, tusd       │         │                     │                   │
│  │ • pdns (DNS)        │         │                     │                   │
│  └─────────────────────┘         └─────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 도메인 및 포트 매핑

| 도메인 | 서버 | 포트 | 서비스 |
|--------|------|------|--------|
| workb.net | 158.247.203.55 | 4107 (green) | Next.js App |
| ws.codeb.kr | 141.164.42.213 | 8000 | Centrifugo WebSocket |
| api.codeb.kr | 158.247.203.55 | 9101 | MCP Deploy API |
| db.codeb.kr | 64.176.226.119 | 5432 | PostgreSQL |

---

## 2. Centrifugo 구성 현황

### 2.1 ⚠️ 문제점: Centrifugo 서버 중복

**현재 Centrifugo가 2개 서버에서 실행 중:**

| 서버 | 컨테이너명 | 포트 | 용도 |
|------|-----------|------|------|
| App (158.247.203.55) | `videopick-centrifugo` | 8000 | 레거시 (videopick 전용) |
| Streaming (141.164.42.213) | `codeb-centrifugo` | 8000 | **workb.net 용 (현재 사용)** |

### 2.2 설정 비교

**App Server (videopick-centrifugo)** - 레거시:
```json
{
  "token_hmac_secret_key": "your-secret-key-here",  // 임시 키
  "api_key": "api-key-here",
  "allowed_origins": ["http://localhost:3000", "https://videopick.kr"],
  "namespaces": [
    {"name": "chat", ...},
    {"name": "stream", ...}
  ]
}
```

**Streaming Server (codeb-centrifugo)** - 현재 사용:
```json
{
  "token_hmac_secret_key": "of0KuRFjjzhq5LlBURCuKqzTUAA08hwL",
  "api_key": "pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G",
  "allowed_origins": ["*"],
  "namespaces": [
    {"name": "user", ...},      // ✅ 개인 알림
    {"name": "workspace", ...}, // ✅ 워크스페이스 알림
    {"name": "project", ...},   // ✅ 프로젝트 실시간
    {"name": "chat", ...}       // ✅ 채팅
  ]
}
```

---

## 3. 데이터 플로우

### 3.1 정상 플로우 (설계 의도)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        실시간 알림 데이터 플로우                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] 서버 측 이벤트 발생 (예: 휴가 승인)                                     │
│       │                                                                     │
│       ▼                                                                     │
│  [2] Server Action 호출                                                     │
│       │   src/actions/hr.ts                                                 │
│       │   └─► notifyLeaveResult(userId, ...)                               │
│       │                                                                     │
│       ▼                                                                     │
│  [3] Centrifugo HTTP API 호출                                               │
│       │   src/lib/centrifugo-client.ts                                     │
│       │   └─► publishToCentrifugo({channel: "user:xxx", data: {...}})      │
│       │   └─► POST http://ws.codeb.kr:8000/api/publish                     │
│       │                                                                     │
│       ▼                                                                     │
│  [4] Centrifugo 서버 (141.164.42.213:8000)                                  │
│       │   └─► 채널 구독자에게 WebSocket 메시지 전송                          │
│       │                                                                     │
│       ▼                                                                     │
│  [5] 클라이언트 WebSocket 수신                                               │
│       │   wss://ws.codeb.kr/connection/websocket                           │
│       │   src/components/providers/centrifugo-provider.tsx                 │
│       │   └─► subscribe("user:xxx", callback)                              │
│       │                                                                     │
│       ▼                                                                     │
│  [6] Header 컴포넌트 알림 표시                                               │
│       │   src/components/layout/Header.tsx                                 │
│       │   └─► setNotifications([...])                                      │
│       │   └─► toast(title)                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 현재 문제점

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ❌ 현재 문제 상황                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  브라우저 (workb.net)                                                        │
│       │                                                                     │
│       │ [1] 토큰 요청                                                       │
│       ▼                                                                     │
│  /api/centrifugo/token                                                      │
│       │ ✅ 토큰 발급 성공 (JWT)                                              │
│       │                                                                     │
│       │ [2] WebSocket 연결 시도                                             │
│       ▼                                                                     │
│  wss://ws.codeb.kr/connection/websocket                                     │
│       │                                                                     │
│       │ ❌ 연결 실패 또는 isConnected = false                               │
│       │                                                                     │
│       ▼                                                                     │
│  Header.tsx                                                                 │
│       └─► "Skipping Centrifugo subscription - not ready"                   │
│                                                                             │
│  원인 분석:                                                                  │
│  - Caddy 로그에 WebSocket 연결 시도 기록 없음                               │
│  - 브라우저에서 실제 WebSocket 연결이 이루어지지 않음                         │
│  - centrifuge 라이브러리 초기화 과정에서 에러 발생 가능                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 코드 구조

### 4.1 관련 파일 목록

| 파일 | 위치 | 역할 |
|------|------|------|
| centrifugo-client.ts | src/lib/ | 서버측 HTTP API 클라이언트 |
| centrifugo-provider.tsx | src/components/providers/ | 클라이언트측 WebSocket Provider |
| Header.tsx | src/components/layout/ | 알림 UI 및 구독 로직 |
| token.ts | src/pages/api/centrifugo/ | JWT 토큰 발급 API |
| publish.ts | src/pages/api/centrifugo/ | 클라이언트 발행 프록시 |
| presence.ts | src/pages/api/centrifugo/ | 접속자 목록 조회 |
| route.ts | src/app/api/notifications/ | DB 알림 CRUD |

### 4.2 환경변수

```bash
# .env.production
NEXT_PUBLIC_CENTRIFUGO_URL=wss://ws.codeb.kr/connection/websocket
CENTRIFUGO_URL=wss://ws.codeb.kr/connection/websocket
CENTRIFUGO_API_URL=http://ws.codeb.kr:8000/api
CENTRIFUGO_API_KEY=pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G
CENTRIFUGO_SECRET=of0KuRFjjzhq5LlBURCuKqzTUAA08hwL
```

---

## 5. 진단 결과

### 5.1 서버 측 (✅ 정상)

- [x] Centrifugo 서버 실행 중 (codeb-centrifugo)
- [x] Namespace 설정 완료 (user, workspace, project, chat)
- [x] HTTP API publish 정상 작동
- [x] Caddy HTTPS 프록시 설정 완료
- [x] 환경변수 올바르게 설정됨

### 5.2 클라이언트 측 (❌ 문제)

- [ ] WebSocket 연결이 실제로 이루어지지 않음
- [ ] `isConnected` 상태가 `false`로 유지
- [ ] Caddy 로그에 WebSocket 연결 기록 없음

### 5.3 추정 원인

1. **centrifuge 라이브러리 초기화 실패**
   - dynamic import 과정에서 에러
   - production 환경에서 번들링 문제

2. **토큰 발급 시점 문제**
   - 토큰 요청 시 세션이 없어 `user: null` 반환
   - anonymous 연결 시도하나 서버에서 거부

3. **Next.js SSR/CSR 충돌**
   - `mounted` 상태 체크 로직 문제
   - Hydration 불일치

---

## 6. 권장 수정사항

### 6.1 즉시 조치 (디버깅)

```typescript
// centrifugo-provider.tsx 수정
// production에서도 로그 출력하도록 변경

const initCentrifugo = async () => {
  try {
    console.log('[Centrifugo] Starting initialization...')
    const { Centrifuge } = await import('centrifuge')
    console.log('[Centrifugo] Library imported successfully')

    const tokenData = await getTokenData()
    console.log('[Centrifugo] Token data:', tokenData)

    // ... 연결 로직

    centrifugoInstance.on('error', (ctx: any) => {
      console.error('[Centrifugo] Connection error:', ctx)
    })
  } catch (error) {
    console.error('[Centrifugo] Initialization failed:', error)
  }
}
```

### 6.2 장기 개선

1. **Centrifugo 서버 통합**
   - App 서버의 `videopick-centrifugo` 제거
   - 모든 프로젝트가 `ws.codeb.kr` 사용

2. **연결 재시도 로직 추가**
   ```typescript
   const MAX_RETRIES = 3
   const RETRY_DELAY = 2000
   ```

3. **Fallback 메커니즘**
   - WebSocket 실패 시 polling으로 전환
   - `/api/notifications` 주기적 호출

---

## 7. 테스트 명령어

### 7.1 서버 상태 확인

```bash
# Centrifugo 서버 info
curl -X POST http://ws.codeb.kr:8000/api/info \
  -H "Authorization: apikey pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G" \
  -H "Content-Type: application/json" \
  -d '{}'

# publish 테스트
curl -X POST http://ws.codeb.kr:8000/api/publish \
  -H "Authorization: apikey pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G" \
  -H "Content-Type: application/json" \
  -d '{"channel": "user:testuser", "data": {"event": "notification", "title": "테스트"}}'
```

### 7.2 브라우저 디버깅

```javascript
// Console에서 실행
const ws = new WebSocket('wss://ws.codeb.kr/connection/websocket');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.log('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

---

## 8. 해결 완료

### 8.1 발견된 문제점

| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| CentrifugoProvider 미실행 | `layout.tsx`에서 주석 처리됨 | Provider 활성화 |
| 구독 권한 오류 (code 103) | `allow_subscribe_for_client` 미설정 | 서버 설정 추가 |
| isDev 변수 미정의 | 변수 선언 누락 | 변수 추가 |

### 8.2 수정된 파일

1. **`src/app/layout.tsx`**
   - CentrifugoProvider import 및 활성화

2. **`src/components/providers/centrifugo-provider.tsx`**
   - `isDev` 변수 추가
   - 상세 로깅 추가 (구독 상태, 메시지 수신)

3. **Centrifugo 서버 설정** (141.164.42.213)
   - `allow_subscribe_for_client: true` 추가 (전역 및 namespace별)

### 8.3 테스트 결과 (2026-01-15)

```
✅ WebSocket 연결: Connected
✅ 토큰 발급: 200 OK
✅ user:xxx 채널 구독: subscribed!
✅ workspace:xxx 채널 구독: subscribed!
✅ 서버 → 클라이언트 메시지 수신: SUCCESS
✅ Header 알림 toast 표시: 정상 작동
```

### 8.4 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ 정상 작동 데이터 플로우                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] 서버 측 이벤트 발생 (예: 휴가 승인)                         │
│       │                                                         │
│       ▼                                                         │
│  [2] Centrifugo HTTP API 호출                                   │
│       │   POST http://ws.codeb.kr:8000/api/publish              │
│       │                                                         │
│       ▼                                                         │
│  [3] Centrifugo 서버 (141.164.42.213:8000)                      │
│       │   └─► 채널 구독자에게 WebSocket 메시지 전송              │
│       │                                                         │
│       ▼                                                         │
│  [4] 클라이언트 WebSocket 수신                                   │
│       │   wss://ws.codeb.kr/connection/websocket                │
│       │   CentrifugoProvider → subscribe() → onMessage()        │
│       │                                                         │
│       ▼                                                         │
│  [5] Header 컴포넌트 알림 표시                                   │
│       └─► toast() + setNotifications()                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 참고 사항

### 9.1 테스트 페이지

`/test-centrifugo` 페이지에서 Centrifugo 연결 상태를 테스트할 수 있습니다.
- WebSocket 연결 상태 확인
- 채널 구독/발행 테스트
- 서버 publish 테스트

### 9.2 Centrifugo 서버 설정 위치

```bash
# 서버: 141.164.42.213
# 설정 파일: /tmp/centrifugo_config.json
# 컨테이너: codeb-centrifugo
```

---

*리포트 생성: Claude Code*
*최종 업데이트: 2026-01-15 08:51 KST*
