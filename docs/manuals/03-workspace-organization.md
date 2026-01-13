# 03. 워크스페이스 & 조직 메뉴얼

> **Version**: 1.0.0
> **Last Updated**: 2026-01-13
> **Module**: Workspace & Organization

---

## 목차

1. [개요](#1-개요)
2. [데이터 모델](#2-데이터-모델)
3. [기능 상세](#3-기능-상세)
4. [API 명세](#4-api-명세)
5. [UI/UX 흐름](#5-uiux-흐름)
6. [비즈니스 로직](#6-비즈니스-로직)
7. [QA 테스트 케이스](#7-qa-테스트-케이스)

---

## 1. 개요

### 1.1 모듈 설명

워크스페이스 & 조직 모듈은 CodeB 플랫폼의 멀티테넌시(Multi-tenancy) 기반을 제공합니다. 하나의 플랫폼에서 여러 조직(회사, 팀)이 독립적으로 운영될 수 있으며, 각 워크스페이스는 고유한 설정과 기능을 가집니다.

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| 워크스페이스 CRUD | 워크스페이스 생성, 조회, 수정, 삭제 |
| 워크스페이스 타입 | ENTERPRISE, HR_ONLY, PROJECT_ONLY |
| 멤버 관리 | 멤버 초대, 역할 관리, 제거 |
| 팀(부서) 관리 | 조직도 구성, 팀 생성/관리 |
| 초대 시스템 | 이메일 초대, 초대 코드, 가입 요청 |
| 가입 요청 | 승인 필요 워크스페이스 가입 신청 |

### 1.3 관련 파일

```
prisma/schema/04-workspace.prisma           # 데이터 모델
src/app/api/workspaces/                      # API 라우트
src/app/(dashboard)/workspace/               # 워크스페이스 페이지
src/app/workspaces/                          # 워크스페이스 선택 페이지
src/lib/workspace-context.tsx                # 워크스페이스 컨텍스트
```

---

## 2. 데이터 모델

### 2.1 Workspace (워크스페이스)

```prisma
model Workspace {
  id              String         @id @default(uuid())
  name            String         // 워크스페이스 이름
  domain          String?        @unique  // 커스텀 도메인
  plan            String         @default("free")  // free, pro, enterprise

  // 워크스페이스 타입 및 비즈니스 설정
  type            WorkspaceType  @default(ENTERPRISE)
  businessType    BusinessType?  // 업종
  businessName    String?        // 상호명
  ownerName       String?        // 대표자명

  // 워크스페이스 검색 및 가입
  slug            String         @unique  // URL 친화적 식별자
  inviteCode      String         @unique  // 짧은 초대 코드 (6자)
  isPublic        Boolean        @default(false)  // 공개 여부
  requireApproval Boolean        @default(true)   // 승인 필요 여부

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}
```

### 2.2 WorkspaceType (워크스페이스 타입)

| 타입 | 설명 | 활성화 기능 |
|------|------|-------------|
| `ENTERPRISE` | 풀 패키지 | 프로젝트 + HR + 급여 + 모든 기능 |
| `HR_ONLY` | 소상공인용 | 근태관리 + 급여만 |
| `PROJECT_ONLY` | 프리랜서/에이전시 | 프로젝트 관리만 |

### 2.3 BusinessType (업종)

| 값 | 한글명 |
|----|--------|
| `RESTAURANT` | 음식점 |
| `CAFE` | 카페 |
| `RETAIL` | 소매/편의점 |
| `BEAUTY` | 미용실/네일샵 |
| `CLINIC` | 병원/의원 |
| `ACADEMY` | 학원 |
| `LOGISTICS` | 물류/배송 |
| `MANUFACTURING` | 제조업 |
| `IT_SERVICE` | IT/소프트웨어 |
| `CONSULTING` | 컨설팅 |
| `OTHER` | 기타 |

### 2.4 WorkspaceMember (워크스페이스 멤버)

```prisma
model WorkspaceMember {
  id          String   @id @default(uuid())
  workspaceId String
  userId      String
  role        Role     @default(member)  // admin, member
  joinedAt    DateTime @default(now())

  @@unique([workspaceId, userId])
}
```

### 2.5 Role (역할)

| 역할 | 설명 | 권한 |
|------|------|------|
| `admin` | 관리자 | 모든 설정 변경, 멤버 관리, 워크스페이스 삭제 |
| `member` | 일반 멤버 | 프로젝트/태스크 사용, 설정 변경 불가 |

### 2.6 Team (팀/부서)

```prisma
model Team {
  id          String   @id @default(uuid())
  workspaceId String
  name        String   // 팀 이름
  color       String   @default("#3B82F6")  // 팀 색상
  order       Int      @default(0)  // 정렬 순서
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 2.7 TeamMember (팀 멤버)

```prisma
model TeamMember {
  id       String   @id @default(uuid())
  teamId   String
  userId   String
  role     String?  // 팀 내 역할 (선택)
  joinedAt DateTime @default(now())

  @@unique([teamId, userId])
}
```

### 2.8 Invitation (초대)

```prisma
model Invitation {
  id          String           @id @default(uuid())
  workspaceId String
  email       String           // 초대받는 이메일
  token       String           @unique  // 초대 토큰 (32자)
  role        Role             @default(member)
  invitedBy   String           // 초대한 사용자 ID
  status      InvitationStatus @default(PENDING)
  expiresAt   DateTime         // 만료일 (7일)
  acceptedAt  DateTime?        // 수락 일시
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

### 2.9 InvitationStatus (초대 상태)

| 상태 | 설명 |
|------|------|
| `PENDING` | 대기 중 |
| `ACCEPTED` | 수락됨 |
| `EXPIRED` | 만료됨 |
| `REVOKED` | 취소됨 |

### 2.10 JoinRequest (가입 요청)

```prisma
model JoinRequest {
  id          String            @id @default(uuid())
  workspaceId String
  userId      String
  message     String?           // 가입 메시지
  status      JoinRequestStatus @default(PENDING)
  reviewedBy  String?           // 검토자 ID
  reviewedAt  DateTime?         // 검토 일시
  reviewNote  String?           // 검토 메모
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([workspaceId, userId])
}
```

### 2.11 JoinRequestStatus (가입 요청 상태)

| 상태 | 설명 |
|------|------|
| `PENDING` | 대기 중 |
| `APPROVED` | 승인됨 |
| `REJECTED` | 거절됨 |
| `CANCELLED` | 취소됨 |

---

## 3. 기능 상세

### 3.1 워크스페이스 생성

#### 3.1.1 생성 프로세스

```typescript
// 워크스페이스 생성 시 자동 처리
1. 이름 중복 확인 (대소문자 무시)
2. 도메인 중복 확인 (있는 경우)
3. Workspace 레코드 생성
4. slug 자동 생성 (name + 랜덤 4자)
5. inviteCode 자동 생성 (랜덤 6자, 대문자)
6. 생성자를 admin으로 WorkspaceMember 추가
7. WorkspaceFeatures 생성 (타입별 프리셋)
```

#### 3.1.2 워크스페이스 타입별 기능 프리셋

**ENTERPRISE (풀 패키지):**

```typescript
{
  // 프로젝트 관리
  projectEnabled: true,
  kanbanEnabled: true,
  ganttEnabled: true,
  mindmapEnabled: true,
  filesEnabled: true,

  // HR 기능
  attendanceEnabled: true,
  employeeEnabled: true,
  payrollEnabled: true,
  payslipEnabled: true,
  leaveEnabled: true,
  hrEnabled: true,
  organizationEnabled: true,

  // 재무 기능
  financeEnabled: true,
  expenseEnabled: true,
  invoiceEnabled: true,
  corporateCardEnabled: true,

  // 고급 기능
  approvalEnabled: true,
  marketingEnabled: true,
  automationEnabled: true,
  logsEnabled: true,

  // 그룹웨어
  announcementEnabled: true,
  boardEnabled: true,
  calendarEnabled: true,
  messageEnabled: true,
  chatEnabled: true,
}
```

**HR_ONLY (소상공인용):**

```typescript
{
  projectEnabled: false,
  kanbanEnabled: false,
  ganttEnabled: false,
  mindmapEnabled: false,
  filesEnabled: false,

  attendanceEnabled: true,
  employeeEnabled: true,
  payrollEnabled: true,
  payslipEnabled: true,
  leaveEnabled: true,
  hrEnabled: true,
  organizationEnabled: true,

  financeEnabled: false,
  expenseEnabled: false,
  invoiceEnabled: false,
  corporateCardEnabled: false,

  approvalEnabled: true,
  marketingEnabled: false,
  automationEnabled: false,
  logsEnabled: true,

  announcementEnabled: true,
  boardEnabled: true,
  calendarEnabled: true,
  messageEnabled: true,
  chatEnabled: true,
}
```

**PROJECT_ONLY (프리랜서/에이전시):**

```typescript
{
  projectEnabled: true,
  kanbanEnabled: true,
  ganttEnabled: true,
  mindmapEnabled: true,
  filesEnabled: true,

  attendanceEnabled: false,
  employeeEnabled: false,
  payrollEnabled: false,
  payslipEnabled: false,
  leaveEnabled: false,
  hrEnabled: false,
  organizationEnabled: true,

  financeEnabled: false,
  expenseEnabled: false,
  invoiceEnabled: false,
  corporateCardEnabled: false,

  approvalEnabled: true,
  marketingEnabled: true,
  automationEnabled: true,
  logsEnabled: true,

  announcementEnabled: true,
  boardEnabled: true,
  calendarEnabled: true,
  messageEnabled: true,
  chatEnabled: true,
}
```

### 3.2 워크스페이스 가입 방식

#### 3.2.1 이메일 초대

```
1. Admin이 이메일로 초대 발송
2. 초대 토큰 생성 (nanoid 32자)
3. 7일 만료 설정
4. 초대 이메일 발송
5. 수신자가 링크 클릭 → 수락 → 멤버 추가
```

#### 3.2.2 초대 코드

```
1. 워크스페이스 생성 시 6자리 코드 자동 생성
2. 코드 공유 (ABC123 형식)
3. 사용자가 코드 입력 → 워크스페이스 검색 → 가입
```

#### 3.2.3 워크스페이스 검색 (공개 워크스페이스)

```
1. isPublic: true 인 워크스페이스
2. 검색 페이지에서 이름/슬러그로 검색
3. 가입 버튼 클릭
   - requireApproval: false → 즉시 가입
   - requireApproval: true → 가입 요청 생성
```

#### 3.2.4 가입 요청 (승인 필요)

```
1. 사용자가 가입 요청 제출
2. JoinRequest 레코드 생성 (PENDING)
3. Admin에게 알림
4. Admin이 승인/거절
   - 승인: WorkspaceMember 생성, 상태 APPROVED
   - 거절: 상태 REJECTED, 사유 기록
```

### 3.3 멤버 관리

#### 3.3.1 멤버 역할 변경

- Admin만 역할 변경 가능
- 본인 역할은 변경 불가 (마지막 Admin 방지)

#### 3.3.2 멤버 제거

- Admin만 멤버 제거 가능
- 본인은 제거 불가
- 마지막 Admin은 제거 불가

### 3.4 팀(부서) 관리

#### 3.4.1 팀 생성

```typescript
{
  name: string,    // 팀 이름
  color: string,   // 팀 색상 (HEX)
  order: number,   // 정렬 순서
}
```

#### 3.4.2 팀 멤버 관리

- 팀에 멤버 추가/제거
- 팀 내 역할 설정 (선택)

---

## 4. API 명세

### 4.1 워크스페이스 목록 조회

```
GET /api/workspaces
```

**응답:**

```json
[
  {
    "id": "uuid",
    "name": "CodeB Team",
    "domain": "codeb",
    "plan": "enterprise",
    "type": "ENTERPRISE",
    "slug": "codeb-team-a1b2",
    "inviteCode": "ABC123",
    "isPublic": false,
    "requireApproval": true,
    "features": {
      "projectEnabled": true,
      "attendanceEnabled": true,
      ...
    },
    "userRole": "admin"
  }
]
```

### 4.2 워크스페이스 생성

```
POST /api/workspaces
```

**요청 본문:**

```json
{
  "name": "새 워크스페이스",
  "domain": "my-workspace",
  "type": "ENTERPRISE"
}
```

**검증 규칙:**
- name: 1-50자, 필수
- domain: URL 친화적 문자열, 선택
- type: ENTERPRISE, HR_ONLY, PROJECT_ONLY 중 하나

**응답 (201 Created):**

```json
{
  "id": "new-uuid",
  "name": "새 워크스페이스",
  "slug": "새-워크스페이스-x1y2",
  "inviteCode": "XYZ789",
  "features": { ... }
}
```

**에러 코드:**

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 400 | NAME_EXISTS | 이름 중복 |
| 400 | DOMAIN_EXISTS | 도메인 중복 |
| 401 | AUTH_REQUIRED | 인증 필요 |

### 4.3 워크스페이스 검색

```
GET /api/workspaces/search?q={query}
```

**응답:**

```json
{
  "workspaces": [
    {
      "id": "uuid",
      "name": "Public Workspace",
      "slug": "public-workspace-a1b2",
      "isPublic": true,
      "requireApproval": false,
      "memberCount": 15
    }
  ]
}
```

### 4.4 워크스페이스 가입

```
POST /api/workspaces/join
```

**요청 본문:**

```json
{
  "workspaceId": "workspace-uuid"
}
```

**응답:**

```json
{
  "message": "CodeB Team 워크스페이스에 가입되었습니다",
  "workspaceId": "uuid",
  "workspaceName": "CodeB Team"
}
```

### 4.5 초대 발송

```
POST /api/workspaces/{workspaceId}/invitations
```

**요청 본문:**

```json
{
  "email": "invitee@example.com",
  "role": "member",
  "invitedBy": "admin-user-id"
}
```

**응답:**

```json
{
  "success": true,
  "invitation": {
    "id": "invitation-uuid",
    "email": "invitee@example.com",
    "role": "member",
    "status": "PENDING",
    "expiresAt": "2024-01-22T00:00:00Z"
  }
}
```

### 4.6 초대 목록 조회

```
GET /api/workspaces/{workspaceId}/invitations?status=PENDING
```

**응답:**

```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "invitee@example.com",
      "role": "member",
      "status": "PENDING",
      "inviter": {
        "id": "user-uuid",
        "name": "홍길동",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-15T00:00:00Z",
      "expiresAt": "2024-01-22T00:00:00Z"
    }
  ]
}
```

### 4.7 가입 요청 생성

```
POST /api/workspaces/{workspaceId}/join-requests
```

**요청 본문:**

```json
{
  "userId": "user-uuid",
  "message": "가입 신청합니다."
}
```

**응답:**

```json
{
  "success": true,
  "joinRequest": {
    "id": "request-uuid",
    "status": "PENDING",
    "user": {
      "id": "user-uuid",
      "name": "김철수",
      "email": "user@example.com"
    },
    "workspace": {
      "id": "workspace-uuid",
      "name": "CodeB Team"
    }
  }
}
```

### 4.8 가입 요청 검토

```
POST /api/workspaces/{workspaceId}/join-requests/{requestId}/review
```

**요청 본문:**

```json
{
  "action": "approve",  // or "reject"
  "reviewNote": "승인합니다."
}
```

---

## 5. UI/UX 흐름

### 5.1 워크스페이스 생성 플로우

```
[워크스페이스 선택 페이지]
    ↓ "새 워크스페이스 만들기" 클릭
[워크스페이스 생성 모달]
    ↓ Step 1: 이름 입력
    ↓ Step 2: 타입 선택 (ENTERPRISE/HR_ONLY/PROJECT_ONLY)
    ↓ Step 3: 비즈니스 정보 (선택)
    ↓ "생성" 버튼 클릭
[성공] → [새 워크스페이스로 이동]
```

### 5.2 워크스페이스 선택 플로우

```
[로그인]
    ↓
[워크스페이스 선택 페이지]
    ├→ 기존 워크스페이스 선택 → 대시보드
    ├→ 새 워크스페이스 만들기 → 생성 플로우
    └→ 워크스페이스 찾기 → 검색/가입 플로우
```

### 5.3 이메일 초대 플로우

```
[Admin - 멤버 관리 페이지]
    ↓ "초대" 버튼 클릭
[이메일 입력 모달]
    ↓ 이메일 + 역할 입력
    ↓ "초대 발송"
[초대 이메일 발송]

---

[수신자 - 이메일 수신]
    ↓ 초대 링크 클릭
[초대 수락 페이지]
    ├→ 로그인 상태: 수락 버튼 표시 → 수락 → 대시보드
    └→ 비로그인: 로그인 유도 → 로그인 후 수락
```

### 5.4 가입 요청 플로우

```
[사용자 - 워크스페이스 검색]
    ↓ 워크스페이스 찾기
[requireApproval: true인 경우]
    ↓ "가입 요청" 버튼 클릭
[가입 요청 제출]
    ↓ 메시지 입력 (선택)
[대기 상태] → "관리자 승인 대기중"

---

[Admin - 가입 요청 목록]
    ↓ 요청 확인
    ├→ "승인" → 멤버 추가 → 신청자에게 알림
    └→ "거절" → 사유 입력 → 신청자에게 알림
```

---

## 6. 비즈니스 로직

### 6.1 권한 매트릭스

| 액션 | Admin | Member |
|------|-------|--------|
| 워크스페이스 설정 변경 | O | X |
| 워크스페이스 삭제 | O | X |
| 멤버 초대 | O | X |
| 멤버 역할 변경 | O | X |
| 멤버 제거 | O | X |
| 가입 요청 승인/거절 | O | X |
| 프로젝트 생성 | O | O |
| 팀 관리 | O | X |

### 6.2 초대 토큰 생성

```typescript
// CVE-CB-012: 암호학적으로 안전한 토큰 생성
import { generateSecureToken } from '@/lib/security'

const token = nanoid(32)  // 초대 토큰
const inviteCode = generateSecureToken(6).toUpperCase()  // 초대 코드
```

### 6.3 Slug 생성 규칙

```typescript
// 이름을 URL 친화적 문자열로 변환 + 랜덤 4자 추가
const slug = `${name.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
}-${generateSecureToken(4)}`

// 예: "CodeB Team" → "codeb-team-a1b2"
```

### 6.4 마지막 Admin 보호

```typescript
// Admin 역할 변경/제거 전 검증
const adminCount = await prisma.workspaceMember.count({
  where: { workspaceId, role: 'admin' }
})

if (adminCount <= 1 && targetMember.role === 'admin') {
  throw new Error('워크스페이스에는 최소 1명의 관리자가 필요합니다')
}
```

### 6.5 초대 만료 처리

```typescript
// 초대 유효성 검증
const isInvitationValid = (invitation: Invitation): boolean => {
  if (invitation.status !== 'PENDING') return false
  if (new Date() > invitation.expiresAt) return false
  return true
}

// 만료 시 상태 업데이트 (스케줄러 또는 조회 시)
if (new Date() > invitation.expiresAt && invitation.status === 'PENDING') {
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'EXPIRED' }
  })
}
```

---

## 7. QA 테스트 케이스

### 7.1 워크스페이스 생성 테스트

#### TC-WS-001: 기본 워크스페이스 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-001 |
| **테스트명** | 기본 워크스페이스 생성 |
| **사전 조건** | 로그인 상태 |
| **테스트 단계** | 1. "새 워크스페이스" 클릭<br>2. 이름 입력: "테스트 팀"<br>3. 타입 선택: ENTERPRISE<br>4. "생성" 클릭 |
| **예상 결과** | - 워크스페이스 생성 성공<br>- 자동으로 Admin 역할 부여<br>- 기본 기능 활성화 |
| **검증 포인트** | - slug 자동 생성<br>- inviteCode 자동 생성<br>- WorkspaceFeatures 생성 |

#### TC-WS-002: 이름 중복 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-002 |
| **테스트명** | 동일 이름 워크스페이스 생성 시도 |
| **테스트 단계** | 1. 기존 워크스페이스 이름과 동일한 이름 입력<br>2. 생성 시도 |
| **예상 결과** | - "이미 사용 중인 워크스페이스 이름입니다" 에러 |

#### TC-WS-003: 타입별 기능 프리셋 확인

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-003 |
| **테스트명** | HR_ONLY 타입 기능 확인 |
| **테스트 단계** | 1. HR_ONLY 타입으로 생성<br>2. 대시보드 확인 |
| **예상 결과** | - 프로젝트 메뉴 숨김<br>- HR/급여 메뉴 표시<br>- 재무 메뉴 숨김 |

### 7.2 멤버 초대 테스트

#### TC-WS-010: 이메일 초대 발송

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-010 |
| **테스트명** | 이메일 초대 발송 |
| **사전 조건** | Admin 권한 |
| **테스트 단계** | 1. 멤버 관리 페이지 이동<br>2. "초대" 버튼 클릭<br>3. 이메일 입력<br>4. 발송 |
| **예상 결과** | - 초대 레코드 생성<br>- 이메일 발송<br>- 초대 목록에 PENDING 표시 |

#### TC-WS-011: 중복 초대 방지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-011 |
| **테스트명** | 같은 이메일로 재초대 |
| **테스트 단계** | 1. 이미 초대된 이메일로 재초대 시도 |
| **예상 결과** | - "이미 초대가 발송된 이메일입니다" 에러 |

#### TC-WS-012: 초대 수락

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-012 |
| **테스트명** | 초대 링크로 가입 |
| **테스트 단계** | 1. 초대 이메일 링크 클릭<br>2. 로그인 (필요시)<br>3. "수락" 클릭 |
| **예상 결과** | - WorkspaceMember 생성<br>- 초대 상태 ACCEPTED<br>- 대시보드로 이동 |

#### TC-WS-013: 만료된 초대

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-013 |
| **테스트명** | 7일 지난 초대 링크 |
| **테스트 단계** | 1. 만료된 초대 링크 접속 |
| **예상 결과** | - "초대가 만료되었습니다" 메시지<br>- 가입 불가 |

### 7.3 가입 요청 테스트

#### TC-WS-020: 가입 요청 제출

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-020 |
| **테스트명** | 승인 필요 워크스페이스 가입 요청 |
| **사전 조건** | isPublic: true, requireApproval: true |
| **테스트 단계** | 1. 워크스페이스 검색<br>2. "가입 요청" 클릭<br>3. 메시지 입력<br>4. 제출 |
| **예상 결과** | - JoinRequest 생성 (PENDING)<br>- "관리자 승인 대기중" 메시지 |

#### TC-WS-021: 가입 요청 승인

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-021 |
| **테스트명** | Admin 가입 요청 승인 |
| **테스트 단계** | 1. 가입 요청 목록 확인<br>2. "승인" 클릭 |
| **예상 결과** | - WorkspaceMember 생성<br>- JoinRequest 상태 APPROVED<br>- 신청자에게 알림 |

#### TC-WS-022: 가입 요청 거절

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-022 |
| **테스트명** | Admin 가입 요청 거절 |
| **테스트 단계** | 1. "거절" 클릭<br>2. 사유 입력 |
| **예상 결과** | - JoinRequest 상태 REJECTED<br>- 사유 저장<br>- 신청자에게 알림 |

#### TC-WS-023: 거절 후 재신청

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-023 |
| **테스트명** | 거절 후 재가입 요청 |
| **테스트 단계** | 1. 거절된 후 재가입 요청 제출 |
| **예상 결과** | - 새 가입 요청 생성 허용<br>- PENDING 상태로 리셋 |

### 7.4 팀 관리 테스트

#### TC-WS-030: 팀 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-030 |
| **테스트명** | 새 팀 생성 |
| **테스트 단계** | 1. 조직 관리 페이지<br>2. "팀 추가" 클릭<br>3. 이름, 색상 입력<br>4. 저장 |
| **예상 결과** | - 팀 생성<br>- 조직도에 표시 |

#### TC-WS-031: 팀 멤버 추가

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-031 |
| **테스트명** | 팀에 멤버 추가 |
| **테스트 단계** | 1. 팀 선택<br>2. "멤버 추가" 클릭<br>3. 워크스페이스 멤버 선택 |
| **예상 결과** | - TeamMember 생성<br>- 팀 멤버 목록에 표시 |

### 7.5 권한 테스트

#### TC-WS-040: Member 권한 제한

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-040 |
| **테스트명** | Member 역할로 설정 변경 시도 |
| **사전 조건** | Member 역할로 로그인 |
| **테스트 단계** | 1. 워크스페이스 설정 접근 시도 |
| **예상 결과** | - 설정 페이지 접근 불가<br>- 또는 403 에러 |

#### TC-WS-041: 마지막 Admin 보호

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-041 |
| **테스트명** | 유일한 Admin 역할 변경 시도 |
| **테스트 단계** | 1. 워크스페이스에 Admin 1명만 있는 상태<br>2. 자신의 역할을 Member로 변경 시도 |
| **예상 결과** | - "최소 1명의 관리자가 필요합니다" 에러 |

### 7.6 워크스페이스 검색/가입 테스트

#### TC-WS-050: 초대 코드로 가입

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-050 |
| **테스트명** | 초대 코드 입력으로 가입 |
| **테스트 단계** | 1. "초대 코드로 가입" 선택<br>2. 6자리 코드 입력<br>3. 가입 |
| **예상 결과** | - 워크스페이스 찾기 성공<br>- 가입 완료 (또는 승인 대기) |

#### TC-WS-051: 공개 워크스페이스 검색

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WS-051 |
| **테스트명** | 공개 워크스페이스 검색 |
| **테스트 단계** | 1. 검색 페이지 이동<br>2. 워크스페이스 이름 검색 |
| **예상 결과** | - isPublic: true 워크스페이스만 표시 |

---

## 부록

### A. API 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/workspaces | 내 워크스페이스 목록 |
| POST | /api/workspaces | 워크스페이스 생성 |
| GET | /api/workspaces/search | 워크스페이스 검색 |
| GET | /api/workspaces/check | 이름/도메인 중복 확인 |
| POST | /api/workspaces/join | 워크스페이스 가입 |
| GET | /api/workspaces/{id}/invitations | 초대 목록 |
| POST | /api/workspaces/{id}/invitations | 초대 발송 |
| GET | /api/workspaces/{id}/join-requests | 가입 요청 목록 |
| POST | /api/workspaces/{id}/join-requests | 가입 요청 생성 |
| POST | /api/workspaces/{id}/join-requests/{rid}/review | 가입 요청 검토 |

### B. 상태 코드 참조

| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (중복, 유효성 오류) |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

### C. 워크스페이스 타입별 기능 비교

| 기능 | ENTERPRISE | HR_ONLY | PROJECT_ONLY |
|------|------------|---------|--------------|
| 프로젝트 관리 | O | X | O |
| 칸반보드 | O | X | O |
| 간트차트 | O | X | O |
| 마인드맵 | O | X | O |
| 근태 관리 | O | O | X |
| 직원 관리 | O | O | X |
| 급여 관리 | O | O | X |
| 휴가 관리 | O | O | X |
| 재무 관리 | O | X | X |
| 그룹웨어 | O | O | O |
| 자동화 | O | X | O |
