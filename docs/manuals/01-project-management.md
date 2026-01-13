# 01. 프로젝트 관리 메뉴얼

> **Version**: 1.0.0
> **Last Updated**: 2026-01-13
> **Module**: Project Management

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

프로젝트 관리 모듈은 CodeB 플랫폼의 핵심 기능으로, 팀의 프로젝트를 생성하고 관리하며 다양한 뷰(칸반, 간트, 마인드맵)로 진행 상황을 추적합니다.

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| 프로젝트 CRUD | 프로젝트 생성, 조회, 수정, 삭제 |
| 프로젝트 뷰 | 리스트, 칸반보드, 간트차트, 마인드맵 |
| 팀원 관리 | 프로젝트 멤버 초대, 역할 관리 |
| 진행률 추적 | 태스크 기반 자동 진행률 계산 |
| 초대 시스템 | 이메일 기반 초대 및 토큰 관리 |

### 1.3 관련 파일

```
prisma/schema/05-project.prisma          # 데이터 모델
src/app/api/projects/                     # API 라우트
src/app/(dashboard)/projects/             # 프론트엔드 페이지
src/components/projects/                  # 컴포넌트
src/actions/project.ts                    # Server Actions
```

---

## 2. 데이터 모델

### 2.1 Project (프로젝트)

```prisma
model Project {
  id          String            @id @default(uuid())
  workspaceId String?           // 소속 워크스페이스
  name        String            // 프로젝트명
  description String?           // 설명
  clientId    String?           // 클라이언트 ID
  clientName  String?           // 클라이언트명
  status      ProjectStatus     @default(planning)
  progress    Int               @default(0)    // 0-100
  startDate   DateTime?         // 시작일
  endDate     DateTime?         // 종료일
  budget      Float?            // 예산
  visibility  ProjectVisibility @default(private)
  priority    ProjectPriority   @default(medium)
  tags        String[]          // 태그 배열
  createdBy   String            // 생성자 ID
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

### 2.2 ProjectStatus (프로젝트 상태)

| 값 | 한글명 | 설명 |
|----|--------|------|
| `planning` | 기획 | 기획 단계 |
| `design` | 디자인 | 디자인 진행 중 |
| `development` | 개발 | 개발 진행 중 |
| `testing` | 테스트 | QA/테스트 진행 중 |
| `completed` | 완료 | 프로젝트 완료 |
| `pending` | 대기 | 일시 중단 |
| `draft` | 초안 | 임시 저장 |

### 2.3 ProjectVisibility (공개 범위)

| 값 | 설명 |
|----|------|
| `public` | 워크스페이스 전체 공개 |
| `private` | 멤버만 접근 가능 |
| `client` | 클라이언트 공유용 |

### 2.4 ProjectPriority (우선순위)

| 값 | 설명 | UI 표시 |
|----|------|---------|
| `low` | 낮음 | 회색 배지 |
| `medium` | 보통 | 파란색 배지 |
| `high` | 높음 | 주황색 배지 |
| `urgent` | 긴급 | 빨간색 배지 |

### 2.5 ProjectMember (프로젝트 멤버)

```prisma
model ProjectMember {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  role      String   // PM, Developer, Designer, Viewer, Admin
  joinedAt  DateTime @default(now())

  @@unique([projectId, userId])  // 중복 방지
}
```

**멤버 역할 종류:**

| 역할 | 권한 |
|------|------|
| `Admin` | 모든 권한 (멤버 관리, 설정 변경, 삭제) |
| `PM` | 프로젝트 관리자 (태스크 관리, 멤버 조회) |
| `Developer` | 개발자 (태스크 편집) |
| `Designer` | 디자이너 (태스크 편집) |
| `Viewer` | 조회 전용 |

### 2.6 ProjectInvitation (프로젝트 초대)

```prisma
model ProjectInvitation {
  id         String                  @id @default(uuid())
  projectId  String
  email      String                  // 초대받는 이메일
  token      String                  @unique  // 32자 nanoid
  role       String                  @default("Viewer")
  invitedBy  String                  // 초대한 사용자 ID
  status     ProjectInvitationStatus @default(PENDING)
  expiresAt  DateTime                // 만료일 (7일)
  acceptedAt DateTime?               // 수락 일시
  createdAt  DateTime                @default(now())
  updatedAt  DateTime                @updatedAt
}
```

**초대 상태:**

| 상태 | 설명 |
|------|------|
| `PENDING` | 대기 중 |
| `ACCEPTED` | 수락됨 |
| `EXPIRED` | 만료됨 |
| `REVOKED` | 취소됨 |

---

## 3. 기능 상세

### 3.1 프로젝트 생성

#### 3.1.1 생성 위자드 단계

1. **기본 정보** (필수)
   - 프로젝트명 (1-100자)
   - 설명 (선택, 최대 1000자)

2. **일정 설정** (선택)
   - 시작일
   - 종료일
   - 예산

3. **옵션 설정** (선택)
   - 상태 (기본: planning)
   - 공개 범위 (기본: private)
   - 우선순위 (기본: medium)

4. **멤버 초대** (선택)
   - 이메일 + 역할 입력
   - 복수 초대 가능

#### 3.1.2 생성 시 자동 처리

```typescript
// 프로젝트 생성 시 자동 수행되는 작업
1. Project 레코드 생성
2. 생성자를 Admin 역할로 ProjectMember 추가
3. 초대 멤버가 있으면 ProjectInvitation 생성
4. 초대 이메일 발송 (SendGrid)
5. Redis 캐시 무효화 (`projects:${workspaceId}:list`)
```

### 3.2 프로젝트 목록

#### 3.2.1 조회 필터

| 필터 | 설명 |
|------|------|
| 탭 필터 | 전체 / 진행 중 / 완료 |
| 상태 필터 | planning, design, development, testing, completed, pending |
| 검색 | 프로젝트명, 설명 검색 |
| 내 프로젝트 | 생성자이거나 팀원인 프로젝트만 |

#### 3.2.2 정렬 옵션

| 정렬 | 설명 |
|------|------|
| 최신순 | `updatedAt DESC` |
| 이름순 | `name ASC` |
| 진행률순 | `progress DESC` |

#### 3.2.3 뷰 모드

- **테이블 뷰**: 상세 정보 표시 (기본)
- **그리드 뷰**: 카드 형태 표시

### 3.3 프로젝트 상세

#### 3.3.1 탭 구성

| 탭 | 경로 | 설명 |
|----|------|------|
| 개요 | `/projects/[id]` | 프로젝트 정보, 통계, 활동 로그 |
| 칸반 | `/projects/[id]/kanban` | 칸반보드 뷰 |
| 간트 | `/projects/[id]/gantt` | 간트차트 뷰 |
| 마인드맵 | `/projects/[id]/mindmap` | 마인드맵 뷰 |
| 팀 | `/projects/[id]/team` | 멤버 관리 |
| 설정 | `/projects/[id]/settings` | 프로젝트 설정 |

### 3.4 칸반보드

#### 3.4.1 기본 컬럼

| 컬럼 ID | 컬럼명 | 색상 | WIP 제한 |
|---------|--------|------|----------|
| `todo` | 할 일 | #ef4444 (빨강) | 10 |
| `in_progress` | 진행 중 | #eab308 (노랑) | 5 |
| `review` | 검토 | #8b5cf6 (보라) | - |
| `done` | 완료 | #10b981 (초록) | - |

#### 3.4.2 드래그 앤 드롭

```typescript
// 태스크 이동 시 처리 로직
1. 로컬 상태 즉시 업데이트 (낙관적 UI)
2. updateTasksOrder API 호출
3. 성공: 활동 로그 기록
4. 실패: 데이터 롤백 및 에러 토스트
```

#### 3.4.3 실시간 동기화

- **프로토콜**: Centrifugo WebSocket
- **채널**: `project:${projectId}`
- **이벤트**:
  - `task-created`: 새 태스크 생성
  - `task-updated`: 태스크 수정
  - `task-deleted`: 태스크 삭제
  - `tasks-reordered`: 순서/컬럼 변경

#### 3.4.4 온라인 사용자 표시

- Presence API로 현재 보드를 보고 있는 사용자 표시
- 아바타 최대 5명 표시 + 추가 인원 수

### 3.5 간트차트

#### 3.5.1 태스크 타입

| 타입 | 설명 |
|------|------|
| `project` | 프로젝트 (상위 항목) |
| `task` | 일반 태스크 |
| `milestone` | 마일스톤 (종료일만) |

#### 3.5.2 기능

- 드래그로 날짜 변경
- 프로그레스바 드래그로 진행률 조절
- 종속성(dependencies) 연결
- 일/주/월 뷰 전환

### 3.6 마인드맵

#### 3.6.1 노드 구조

```typescript
// 루트 노드: 프로젝트명
// 자식 노드: 각 태스크
{
  id: 'root',
  data: { label: projectName },
  type: 'input'
}
// 태스크 노드
{
  id: task.id,
  data: { label: task.title, status: task.status },
  type: 'default'
}
```

#### 3.6.2 레이아웃

- **Dagre 알고리즘** 사용
- 방향: TB (Top to Bottom) / LR (Left to Right)
- 자동 정렬 기능

#### 3.6.3 동기화

- 마인드맵에서 생성한 태스크는 칸반/간트에 자동 반영
- 실시간 새로고침으로 다른 뷰 변경사항 동기화

### 3.7 팀원 관리

#### 3.7.1 멤버 추가 방식

1. **워크스페이스 멤버 직접 추가**
   - 이미 워크스페이스 멤버인 경우
   - 즉시 프로젝트 멤버로 추가

2. **이메일 초대**
   - 외부 사용자 또는 아직 가입하지 않은 사용자
   - 초대 링크 발송 → 수락 → 멤버 추가

#### 3.7.2 권한 검증

```typescript
// 멤버 관리 권한
- Admin만 초대/제거 가능
- 모든 프로젝트 멤버는 멤버 목록 조회 가능
```

---

## 4. API 명세

### 4.1 프로젝트 목록 조회

```
GET /api/projects?workspaceId={workspaceId}
```

**요청 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| workspaceId | string | O | 워크스페이스 ID |
| refresh | boolean | X | 캐시 새로고침 |

**응답:**

```json
[
  {
    "id": "uuid",
    "name": "프로젝트명",
    "description": "설명",
    "status": "development",
    "priority": "high",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-03-31T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  }
]
```

**에러 코드:**

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 401 | AUTH_REQUIRED | 인증 필요 |
| 400 | WORKSPACE_ID_REQUIRED | 워크스페이스 ID 누락 |
| 403 | NOT_A_MEMBER | 워크스페이스 멤버 아님 |

**캐싱:**
- TTL: 5분 (CacheTTL.MEDIUM)
- 캐시 키: `projects:${workspaceId}:list`

### 4.2 프로젝트 멤버 조회

```
GET /api/projects/{id}/members
```

**응답:**

```json
[
  {
    "id": "member-uuid",
    "userId": "user-uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "avatar": "https://...",
    "role": "Admin",
    "joinedAt": "2024-01-01T00:00:00Z"
  }
]
```

### 4.3 프로젝트 멤버 추가

```
POST /api/projects/{id}/members
```

**요청 본문:**

```json
{
  "userId": "user-uuid",
  "role": "Developer"
}
```

**검증 규칙:**
- 요청자가 프로젝트 멤버여야 함
- 대상 사용자가 워크스페이스 멤버여야 함
- 이미 프로젝트 멤버가 아니어야 함

### 4.4 프로젝트 초대 생성

```
POST /api/projects/{id}/invitations
```

**요청 본문:**

```json
{
  "email": "invitee@example.com",
  "role": "Developer"
}
```

**처리 로직:**
1. 요청자가 Admin 역할 확인
2. 이미 멤버인지 확인
3. 대기 중인 초대가 있는지 확인
4. 초대 토큰 생성 (nanoid 32자)
5. 만료일 설정 (7일 후)
6. 초대 이메일 발송

**응답:**

```json
{
  "id": "invitation-uuid",
  "email": "invitee@example.com",
  "token": "32자_토큰",
  "role": "Developer",
  "status": "PENDING",
  "expiresAt": "2024-01-08T00:00:00Z",
  "inviteUrl": "https://app.codeb.kr/invite/project/토큰",
  "emailSent": true
}
```

### 4.5 초대 수락

```
POST /api/project-invitations/{token}/accept
```

**처리 로직:**
1. 토큰으로 초대 조회
2. 만료 여부 확인
3. 상태가 PENDING인지 확인
4. 사용자가 로그인 상태인지 확인
5. ProjectMember 생성
6. 초대 상태를 ACCEPTED로 변경

### 4.6 프로젝트 태스크 조회

```
GET /api/projects/{id}/tasks
```

**응답:**

```json
[
  {
    "id": "task-uuid",
    "title": "태스크 제목",
    "description": "설명",
    "status": "in_progress",
    "priority": "high",
    "assignee": {
      "id": "user-uuid",
      "name": "홍길동",
      "avatar": "https://..."
    },
    "project": {
      "id": "project-uuid",
      "name": "프로젝트명"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

**캐싱:**
- TTL: 60초 (CacheTTL.TASKS)
- 캐시 키: `project:${projectId}:tasks`

### 4.7 태스크 생성

```
POST /api/projects/{id}/tasks
```

**요청 본문:**

```json
{
  "title": "새 태스크",
  "description": "설명",
  "status": "todo",
  "priority": "medium",
  "assigneeId": "user-uuid",
  "dueDate": "2024-02-01T00:00:00Z"
}
```

**검증 (Zod 스키마):**
- title: 1-200자 필수
- status: TaskStatus enum
- priority: TaskPriority enum

---

## 5. UI/UX 흐름

### 5.1 프로젝트 생성 플로우

```
[프로젝트 목록]
    ↓ "새 프로젝트" 버튼 클릭
[생성 위자드 모달]
    ↓ Step 1: 기본 정보 입력
    ↓ Step 2: 일정 설정
    ↓ Step 3: 옵션 설정
    ↓ Step 4: 멤버 초대
    ↓ "생성" 버튼 클릭
[성공 토스트] → [프로젝트 상세 페이지로 이동]
```

### 5.2 프로젝트 상세 플로우

```
[프로젝트 목록]
    ↓ 프로젝트 클릭
[프로젝트 상세 - 개요 탭]
    ├→ [칸반 탭] - 칸반보드 뷰
    ├→ [간트 탭] - 간트차트 뷰
    ├→ [마인드맵] - 마인드맵 뷰
    ├→ [팀 탭] - 멤버 관리
    └→ [설정 탭] - 프로젝트 설정
```

### 5.3 초대 수락 플로우

```
[초대 이메일 수신]
    ↓ 초대 링크 클릭
[/invite/project/{token}]
    ├→ 로그인 상태: 초대 정보 표시 → "수락" 클릭 → 프로젝트로 이동
    └→ 비로그인 상태: 로그인 페이지 → 로그인 후 자동 리다이렉트
```

### 5.4 칸반 드래그 앤 드롭 플로우

```
[태스크 카드 드래그 시작]
    ↓
[다른 컬럼으로 드롭]
    ↓
[낙관적 UI 업데이트] - 즉시 화면 반영
    ↓
[API 호출: updateTasksOrder]
    ├→ 성공: 활동 로그 기록, 토스트 표시
    └→ 실패: 상태 롤백, 에러 토스트
    ↓
[실시간 이벤트 발행] → 다른 사용자에게 전파
```

---

## 6. 비즈니스 로직

### 6.1 진행률 계산

```typescript
// 프로젝트 진행률 = 완료 태스크 수 / 전체 태스크 수 * 100
const calculateProgress = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0
  const completedTasks = tasks.filter(t => t.status === 'done').length
  return Math.round((completedTasks / tasks.length) * 100)
}
```

### 6.2 권한 검증 매트릭스

| 액션 | Admin | PM | Developer | Designer | Viewer |
|------|-------|-----|-----------|----------|--------|
| 프로젝트 조회 | O | O | O | O | O |
| 프로젝트 수정 | O | O | X | X | X |
| 프로젝트 삭제 | O | X | X | X | X |
| 멤버 초대 | O | X | X | X | X |
| 멤버 제거 | O | X | X | X | X |
| 태스크 생성 | O | O | O | O | X |
| 태스크 수정 | O | O | O | O | X |
| 태스크 삭제 | O | O | O | O | X |

### 6.3 초대 만료 처리

```typescript
// 초대 링크 유효성 검증
const isInvitationValid = (invitation: ProjectInvitation): boolean => {
  if (invitation.status !== 'PENDING') return false
  if (new Date() > invitation.expiresAt) return false
  return true
}
```

### 6.4 캐시 무효화 전략

| 이벤트 | 무효화 캐시 |
|--------|-------------|
| 프로젝트 생성 | `projects:${workspaceId}:list` |
| 프로젝트 수정 | `projects:${workspaceId}:list` |
| 태스크 생성 | `project:${projectId}:tasks`, `dashboard:${workspaceId}:stats` |
| 태스크 수정 | `project:${projectId}:tasks` |
| 태스크 삭제 | `project:${projectId}:tasks`, `dashboard:${workspaceId}:stats` |

---

## 7. QA 테스트 케이스

### 7.1 프로젝트 생성 테스트

#### TC-PM-001: 기본 프로젝트 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-001 |
| **테스트명** | 기본 프로젝트 생성 |
| **사전 조건** | 로그인 상태, 워크스페이스 선택됨 |
| **테스트 단계** | 1. "새 프로젝트" 버튼 클릭<br>2. 프로젝트명 입력: "테스트 프로젝트"<br>3. "생성" 버튼 클릭 |
| **예상 결과** | - 성공 토스트 표시<br>- 프로젝트 상세 페이지로 이동<br>- 프로젝트 목록에 새 프로젝트 표시 |
| **검증 포인트** | - DB에 Project 레코드 생성 확인<br>- 생성자가 Admin으로 ProjectMember 추가 확인 |

#### TC-PM-002: 프로젝트명 유효성 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-002 |
| **테스트명** | 프로젝트명 유효성 검증 |
| **테스트 단계** | 1. 프로젝트명 비워두고 생성 시도<br>2. 100자 초과 프로젝트명 입력 시도 |
| **예상 결과** | - 빈 이름: "프로젝트명을 입력해주세요" 에러<br>- 초과: "100자 이내로 입력해주세요" 에러 |

#### TC-PM-003: 멤버 초대와 함께 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-003 |
| **테스트명** | 멤버 초대와 함께 프로젝트 생성 |
| **테스트 단계** | 1. 프로젝트 정보 입력<br>2. 멤버 초대 단계에서 이메일 추가<br>3. 생성 완료 |
| **예상 결과** | - "N명에게 초대 이메일을 발송했습니다" 메시지<br>- ProjectInvitation 레코드 생성<br>- 초대 이메일 발송 (SendGrid 로그 확인) |

### 7.2 프로젝트 목록 테스트

#### TC-PM-010: 목록 필터링

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-010 |
| **테스트명** | 상태별 필터링 |
| **테스트 단계** | 1. "진행 중" 탭 클릭<br>2. "완료" 탭 클릭<br>3. 각 상태 버튼 클릭 |
| **예상 결과** | - 각 필터에 맞는 프로젝트만 표시<br>- 프로젝트 수 카운트 정확 |

#### TC-PM-011: 검색 기능

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-011 |
| **테스트명** | 프로젝트 검색 |
| **테스트 단계** | 1. 검색창에 "테스트" 입력<br>2. 존재하지 않는 키워드 입력 |
| **예상 결과** | - 프로젝트명/설명에 포함된 프로젝트 표시<br>- 결과 없으면 "검색 결과가 없습니다" 표시 |

#### TC-PM-012: 내 프로젝트 필터

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-012 |
| **테스트명** | 내 프로젝트만 보기 |
| **테스트 단계** | 1. "내 프로젝트" 버튼 활성화<br>2. 버튼 비활성화 |
| **예상 결과** | - 활성화: 본인이 생성했거나 팀원인 프로젝트만 표시<br>- 비활성화: 전체 프로젝트 표시 |

### 7.3 칸반보드 테스트

#### TC-PM-020: 태스크 드래그 앤 드롭

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-020 |
| **테스트명** | 태스크 컬럼 이동 |
| **테스트 단계** | 1. "할 일" 컬럼의 태스크를 "진행 중"으로 드래그<br>2. 페이지 새로고침 |
| **예상 결과** | - 드롭 즉시 UI 업데이트<br>- "작업이 이동되었습니다" 토스트<br>- 새로고침 후에도 변경 유지<br>- 활동 로그에 기록 |

#### TC-PM-021: 실시간 동기화

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-021 |
| **테스트명** | 다중 사용자 실시간 동기화 |
| **사전 조건** | 브라우저 2개로 같은 프로젝트 칸반보드 열기 |
| **테스트 단계** | 1. 브라우저 A에서 태스크 이동<br>2. 브라우저 B 확인 |
| **예상 결과** | - 브라우저 B에 자동 반영<br>- "실시간 동기화 중" 표시 확인 |

#### TC-PM-022: WIP 제한

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-022 |
| **테스트명** | Work In Progress 제한 |
| **테스트 단계** | 1. "진행 중" 컬럼에 5개 이상 태스크 추가 시도 |
| **예상 결과** | - 제한 경고 표시<br>- 추가는 허용되나 경고 유지 |

#### TC-PM-023: 온라인 사용자 표시

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-023 |
| **테스트명** | 현재 접속 사용자 표시 |
| **테스트 단계** | 1. 두 명 이상 같은 칸반보드 접속<br>2. 한 명 페이지 이탈 |
| **예상 결과** | - 접속자 아바타 표시<br>- 이탈 시 아바타 제거 |

### 7.4 팀원 관리 테스트

#### TC-PM-030: 멤버 직접 추가

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-030 |
| **테스트명** | 워크스페이스 멤버 추가 |
| **사전 조건** | Admin 권한 |
| **테스트 단계** | 1. 팀 탭 이동<br>2. 워크스페이스 멤버 선택<br>3. 역할 선택 후 추가 |
| **예상 결과** | - 멤버 목록에 즉시 추가<br>- 추가된 멤버는 프로젝트 접근 가능 |

#### TC-PM-031: 이메일 초대

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-031 |
| **테스트명** | 외부 사용자 이메일 초대 |
| **테스트 단계** | 1. 초대 버튼 클릭<br>2. 이메일 입력<br>3. 역할 선택 후 초대 |
| **예상 결과** | - "초대가 발송되었습니다" 메시지<br>- 대기 중 초대 목록에 표시<br>- 이메일 수신 확인 |

#### TC-PM-032: 초대 수락

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-032 |
| **테스트명** | 초대 수락 프로세스 |
| **테스트 단계** | 1. 초대 이메일 링크 클릭<br>2. 로그인 (필요시)<br>3. 수락 버튼 클릭 |
| **예상 결과** | - 프로젝트 멤버로 추가<br>- 프로젝트 상세 페이지로 이동<br>- 초대 상태 ACCEPTED로 변경 |

#### TC-PM-033: 만료된 초대

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-033 |
| **테스트명** | 만료된 초대 링크 접근 |
| **사전 조건** | 7일 지난 초대 링크 |
| **테스트 단계** | 1. 만료된 초대 링크 접속 |
| **예상 결과** | - "초대가 만료되었습니다" 메시지<br>- 프로젝트 접근 불가 |

#### TC-PM-034: 권한 없는 멤버 관리 시도

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-034 |
| **테스트명** | Viewer 권한으로 멤버 초대 시도 |
| **사전 조건** | Viewer 역할로 로그인 |
| **테스트 단계** | 1. 팀 탭 이동<br>2. 초대 버튼 확인 |
| **예상 결과** | - 초대 버튼 미표시 또는 비활성화<br>- API 직접 호출 시 403 에러 |

### 7.5 간트차트 테스트

#### TC-PM-040: 날짜 드래그 변경

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-040 |
| **테스트명** | 태스크 일정 드래그 변경 |
| **테스트 단계** | 1. 태스크 바를 좌우로 드래그<br>2. 시작/종료 날짜 확인 |
| **예상 결과** | - 날짜 즉시 변경<br>- 관련 종속 태스크 자동 조정 |

#### TC-PM-041: 진행률 조정

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-041 |
| **테스트명** | 진행률 바 드래그 |
| **테스트 단계** | 1. 태스크 프로그레스바 드래그<br>2. 진행률 확인 |
| **예상 결과** | - 진행률 퍼센트 변경<br>- 프로젝트 전체 진행률 재계산 |

### 7.6 마인드맵 테스트

#### TC-PM-050: 태스크 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-050 |
| **테스트명** | 마인드맵에서 태스크 생성 |
| **테스트 단계** | 1. "작업 추가" 버튼 클릭<br>2. 칸반보드 확인 |
| **예상 결과** | - 새 노드 생성<br>- 칸반보드 "할 일" 컬럼에 태스크 추가 |

#### TC-PM-051: 자동 레이아웃

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-051 |
| **테스트명** | 자동 정렬 기능 |
| **테스트 단계** | 1. 노드 위치를 무작위로 이동<br>2. "자동 정렬" 버튼 클릭 |
| **예상 결과** | - Dagre 알고리즘으로 정렬<br>- 계층 구조 시각화 |

### 7.7 에러 처리 테스트

#### TC-PM-060: 네트워크 오류 복구

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-060 |
| **테스트명** | 네트워크 연결 끊김 처리 |
| **테스트 단계** | 1. 개발자 도구에서 네트워크 오프라인 설정<br>2. 태스크 이동 시도<br>3. 네트워크 복구 |
| **예상 결과** | - "오프라인" 상태 표시<br>- 에러 토스트<br>- 재연결 시 자동 동기화 |

#### TC-PM-061: 동시 편집 충돌

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PM-061 |
| **테스트명** | 동시 편집 시 충돌 처리 |
| **테스트 단계** | 1. 두 사용자가 동시에 같은 태스크 수정 |
| **예상 결과** | - 마지막 저장이 우선<br>- 실시간으로 다른 사용자 변경 반영 |

---

## 부록

### A. 관련 API 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/projects | 프로젝트 목록 |
| POST | /api/projects | 프로젝트 생성 |
| GET | /api/projects/[id] | 프로젝트 상세 |
| PUT | /api/projects/[id] | 프로젝트 수정 |
| DELETE | /api/projects/[id] | 프로젝트 삭제 |
| GET | /api/projects/[id]/members | 멤버 목록 |
| POST | /api/projects/[id]/members | 멤버 추가 |
| DELETE | /api/projects/[id]/members/[memberId] | 멤버 제거 |
| GET | /api/projects/[id]/invitations | 초대 목록 |
| POST | /api/projects/[id]/invitations | 초대 생성 |
| DELETE | /api/projects/[id]/invitations | 초대 취소 |
| GET | /api/projects/[id]/tasks | 태스크 목록 |
| POST | /api/projects/[id]/tasks | 태스크 생성 |
| POST | /api/project-invitations/[token]/accept | 초대 수락 |
| POST | /api/project-invitations/[token]/decline | 초대 거절 |

### B. 상태 코드 참조

| 코드 | 의미 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

### C. 캐시 키 패턴

| 키 패턴 | TTL | 설명 |
|---------|-----|------|
| `projects:${workspaceId}:list` | 5분 | 프로젝트 목록 |
| `project:${projectId}:tasks` | 60초 | 프로젝트 태스크 |
| `dashboard:${workspaceId}:stats` | 5분 | 대시보드 통계 |
