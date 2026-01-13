# 02. 태스크 관리 메뉴얼

> **Version**: 1.0.0
> **Last Updated**: 2026-01-13
> **Module**: Task Management

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

태스크 관리 모듈은 프로젝트 내 작업을 생성, 관리, 추적하는 핵심 기능입니다. 칸반보드, 간트차트, 마인드맵 등 다양한 뷰와 연동되며, 휴지통 기능으로 실수로 삭제한 태스크를 복구할 수 있습니다.

### 1.2 주요 기능

| 기능 | 설명 |
|------|------|
| 태스크 CRUD | 태스크 생성, 조회, 수정, 삭제 |
| 상태 관리 | backlog → todo → in_progress → review → done |
| 우선순위 | low, medium, high, urgent |
| 담당자 할당 | 프로젝트 멤버에게 태스크 할당 |
| 체크리스트 | 세부 작업 항목 관리 |
| 첨부파일 | 파일 업로드 및 관리 |
| 댓글 | 태스크 내 토론 |
| 휴지통 | Soft delete 및 복구 |
| 부서(팀) 연결 | 부서별 태스크 분류 |

### 1.3 관련 파일

```
prisma/schema/06-task.prisma              # 데이터 모델
src/actions/task.ts                        # Server Actions
src/app/api/projects/[id]/tasks/route.ts   # API 라우트
src/components/kanban/                     # 칸반 컴포넌트
src/types/task.ts                          # 타입 정의
```

---

## 2. 데이터 모델

### 2.1 Task (태스크)

```prisma
model Task {
  id          String       @id @default(uuid())
  projectId   String?      // null이면 개인 태스크
  title       String
  description String?
  status      TaskStatus   @default(todo)
  priority    TaskPriority @default(medium)

  startDate   DateTime?    // 시작일
  dueDate     DateTime?    // 마감일

  assigneeId  String?      // 담당자 ID
  createdBy   String       // 생성자 ID

  teamId      String?      // 부서(팀) ID
  labels      String[]     // 라벨 배열

  // 칸반 전용
  columnId    String?      // 컬럼 ID
  order       Int          @default(0)  // 컬럼 내 순서

  // 간트 전용
  progress     Int         @default(0)  // 진행률 0-100
  color        String?     // 간트 바 색상
  dependencies String[]    // 종속 태스크 ID 배열

  // 마인드맵 전용
  mindmapNodeId String?

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?    // Soft delete
}
```

### 2.2 TaskStatus (태스크 상태)

| 값 | 한글명 | 칸반 컬럼 | 설명 |
|----|--------|-----------|------|
| `backlog` | 백로그 | - | 대기 목록 |
| `todo` | 할 일 | todo | 시작 예정 |
| `in_progress` | 진행 중 | in_progress | 작업 중 |
| `review` | 검토 | review | 리뷰 대기 |
| `done` | 완료 | done | 작업 완료 |

### 2.3 TaskPriority (우선순위)

| 값 | 한글명 | UI 색상 | 설명 |
|----|--------|---------|------|
| `low` | 낮음 | #6b7280 (회색) | 낮은 우선순위 |
| `medium` | 보통 | #3b82f6 (파랑) | 기본 우선순위 |
| `high` | 높음 | #f59e0b (주황) | 높은 우선순위 |
| `urgent` | 긴급 | #ef4444 (빨강) | 즉시 처리 필요 |

### 2.4 TaskAttachment (첨부파일)

```prisma
model TaskAttachment {
  id         String   @id @default(uuid())
  taskId     String
  name       String   // 파일명
  url        String   // 저장 URL
  size       Int      // 파일 크기 (bytes)
  type       String   // MIME 타입
  uploadedBy String   // 업로더 ID
  uploadedAt DateTime @default(now())
}
```

### 2.5 ChecklistItem (체크리스트)

```prisma
model ChecklistItem {
  id        String  @id @default(uuid())
  taskId    String
  text      String  // 항목 내용
  completed Boolean @default(false)  // 완료 여부
}
```

### 2.6 TaskComment (댓글)

```prisma
model TaskComment {
  id        String   @id @default(uuid())
  taskId    String
  userId    String   // 작성자 ID
  text      String   // 댓글 내용
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 3. 기능 상세

### 3.1 태스크 생성

#### 3.1.1 생성 방법

1. **칸반보드에서 생성**
   - 컬럼 하단 "+" 버튼 클릭
   - 제목 입력 후 Enter
   - 해당 컬럼의 상태로 자동 설정

2. **모달에서 상세 생성**
   - 모든 필드 입력 가능
   - 담당자, 마감일, 우선순위 설정

3. **마인드맵에서 생성**
   - "작업 추가" 버튼
   - 기본값으로 생성 후 칸반/간트 동기화

#### 3.1.2 필수/선택 필드

| 필드 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| title | O | - | 1-200자 |
| description | X | '' | 상세 설명 |
| status | X | 'todo' | 태스크 상태 |
| priority | X | 'medium' | 우선순위 |
| assigneeId | X | null | 담당자 |
| dueDate | X | null | 마감일 |
| teamId | X | null | 부서(팀) |
| labels | X | [] | 라벨 배열 |

#### 3.1.3 생성 후 자동 처리

```typescript
// 태스크 생성 시 자동 수행
1. Task 레코드 생성
2. 프로젝트 진행률 재계산 (updateProjectProgress)
3. 실시간 이벤트 발행 ('task-created')
4. 캐시 무효화 (dashboard:stats:*)
5. 페이지 재검증 (revalidatePath)
```

### 3.2 태스크 조회

#### 3.2.1 프로젝트 태스크 조회 (getTasks)

```typescript
// 프로젝트 ID로 태스크 조회
const tasks = await getTasks(projectId)

// 조회 조건
- projectId 일치
- deletedAt이 null (휴지통 제외)
- order ASC 정렬
```

#### 3.2.2 전체 태스크 조회 (getAllTasks)

```typescript
// 사용자의 모든 태스크 조회
const tasks = await getAllTasks(userId, workspaceId)

// 조회 조건 (OR 조합)
- 내가 만든 개인 태스크 (projectId null)
- 나에게 할당된 태스크
- 내가 멤버인 프로젝트의 태스크
```

#### 3.2.3 조회 시 포함 정보

```typescript
{
  // 기본 정보
  id, title, description, status, priority,
  startDate, dueDate, order, columnId, labels,

  // 관계 데이터
  assignee: { id, name, email, avatar },
  team: { id, name, color },
  attachments: [...],
  checklist: [...],
  comments: [...] // 최신 10개
}
```

### 3.3 태스크 수정

#### 3.3.1 수정 가능 필드

| 필드 | 타입 | 제약 조건 |
|------|------|----------|
| title | string | 1-200자 |
| description | string | 최대 5000자 |
| status | TaskStatus | enum 값 |
| priority | TaskPriority | enum 값 |
| assigneeId | string | 유효한 사용자 ID |
| dueDate | Date | ISO 8601 형식 |
| startDate | Date | ISO 8601 형식 |
| teamId | string | 유효한 팀 ID |
| labels | string[] | 문자열 배열 |
| columnId | string | 칸반 컬럼 ID |
| order | number | 0 이상 정수 |
| progress | number | 0-100 |

#### 3.3.2 수정 후 자동 처리

```typescript
// 태스크 수정 시 자동 수행
1. Task 레코드 업데이트
2. 프로젝트 진행률 재계산
3. 실시간 이벤트 발행 ('task-updated')
4. 캐시 무효화
5. 페이지 재검증
```

### 3.4 태스크 삭제 (Soft Delete)

#### 3.4.1 삭제 프로세스

```typescript
// deleteTask(taskId)
1. deletedAt을 현재 시간으로 설정 (soft delete)
2. 프로젝트 진행률 재계산
3. 실시간 이벤트 발행 ('task-deleted')
4. 캐시 무효화
```

#### 3.4.2 휴지통 기능

| 기능 | 함수 | 설명 |
|------|------|------|
| 휴지통 조회 | `getTrashedTasks(userId)` | 삭제된 태스크 목록 |
| 복원 | `restoreTask(taskId)` | deletedAt을 null로 |
| 영구 삭제 | `permanentDeleteTask(taskId)` | DB에서 완전 삭제 |
| 휴지통 비우기 | `emptyTrash(userId)` | 모든 삭제 태스크 영구 삭제 |

### 3.5 태스크 순서 변경

#### 3.5.1 칸반 드래그 앤 드롭

```typescript
// updateTasksOrder(projectId, tasks)
// tasks: [{ id, columnId, order }]

// 처리 로직
1. 기존 DB의 태스크 ID 확인 (존재하지 않는 태스크 필터링)
2. 트랜잭션으로 일괄 업데이트
3. columnId → status 자동 매핑
4. 실시간 이벤트 발행 ('tasks-reordered')
```

#### 3.5.2 컬럼-상태 매핑

```typescript
const columnToStatus = {
  'todo': 'todo',
  'in_progress': 'in_progress',
  'review': 'review',
  'done': 'done'
}
```

### 3.6 체크리스트

#### 3.6.1 체크리스트 구조

```typescript
{
  id: string,
  taskId: string,
  text: string,        // 항목 내용
  completed: boolean   // 완료 여부
}
```

#### 3.6.2 체크리스트 진행률

```typescript
// 체크리스트 완료율 계산
const completedCount = checklist.filter(item => item.completed).length
const progress = Math.round((completedCount / checklist.length) * 100)
```

### 3.7 첨부파일

#### 3.7.1 첨부파일 업로드

```typescript
{
  taskId: string,
  name: string,      // 원본 파일명
  url: string,       // 저장 URL (S3, 로컬 등)
  size: number,      // bytes
  type: string,      // MIME 타입
  uploadedBy: string // 업로더 ID
}
```

#### 3.7.2 지원 파일 형식

| 카테고리 | 확장자 |
|----------|--------|
| 이미지 | jpg, jpeg, png, gif, webp |
| 문서 | pdf, doc, docx, xls, xlsx, ppt, pptx |
| 텍스트 | txt, md, csv |
| 압축 | zip, rar |

### 3.8 댓글

#### 3.8.1 댓글 구조

```typescript
{
  id: string,
  taskId: string,
  userId: string,
  text: string,
  createdAt: DateTime,
  updatedAt: DateTime,
  user: {
    id, name, avatar
  }
}
```

#### 3.8.2 댓글 권한

- 생성: 프로젝트 멤버 (Viewer 제외)
- 수정: 본인 댓글만
- 삭제: 본인 댓글 또는 Admin

### 3.9 부서(팀) 연결

#### 3.9.1 팀 연결 목적

- 부서별 태스크 분류
- 팀 색상으로 시각적 구분
- 필터링 및 리포팅

#### 3.9.2 태스크-팀 관계

```typescript
Task {
  teamId: string?  // 팀 ID 참조
  team: {
    id, name, color  // 팀 정보
  }
}
```

---

## 4. API 명세

### 4.1 프로젝트 태스크 목록 조회

```
GET /api/projects/{projectId}/tasks
```

**요청 헤더:**

| 헤더 | 필수 | 설명 |
|------|------|------|
| Authorization | O | Bearer 토큰 또는 세션 |

**응답:**

```json
[
  {
    "id": "uuid",
    "title": "태스크 제목",
    "description": "설명",
    "status": "in_progress",
    "priority": "high",
    "columnId": "in_progress",
    "order": 0,
    "assignee": {
      "id": "user-uuid",
      "name": "홍길동",
      "email": "hong@example.com",
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

### 4.2 태스크 생성

```
POST /api/projects/{projectId}/tasks
```

**요청 본문:**

```json
{
  "title": "새 태스크",
  "description": "설명",
  "status": "todo",
  "priority": "medium",
  "assigneeId": "user-uuid",
  "dueDate": "2024-02-01T00:00:00Z",
  "teamId": "team-uuid"
}
```

**검증 (Zod 스키마):**

```typescript
const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  teamId: z.string().uuid().optional(),
})
```

**응답 (201 Created):**

```json
{
  "id": "new-task-uuid",
  "title": "새 태스크",
  "status": "todo",
  "priority": "medium",
  "createdAt": "2024-01-15T00:00:00Z"
}
```

### 4.3 Server Actions

#### 4.3.1 getTasks

```typescript
export async function getTasks(projectId: string): Promise<Task[]>
```

#### 4.3.2 getAllTasks

```typescript
export async function getAllTasks(
  userId: string,
  workspaceId?: string,
  options?: { cursor?: string; limit?: number }
): Promise<Task[]>
```

#### 4.3.3 createTask

```typescript
export async function createTask(
  projectId: string | null,
  data: CreateTaskInput
): Promise<{ success: boolean; task?: Task; error?: string }>
```

#### 4.3.4 updateTask

```typescript
export async function updateTask(
  taskId: string,
  data: Partial<Task>
): Promise<{ success: boolean; task?: Task; error?: string }>
```

#### 4.3.5 deleteTask

```typescript
export async function deleteTask(
  taskId: string
): Promise<{ success: boolean; error?: string }>
```

#### 4.3.6 restoreTask

```typescript
export async function restoreTask(
  taskId: string
): Promise<{ success: boolean; task?: Task; error?: string }>
```

#### 4.3.7 updateTasksOrder

```typescript
export async function updateTasksOrder(
  projectId: string,
  tasks: { id: string; columnId: string; order: number }[]
): Promise<{ success: boolean; error?: string }>
```

---

## 5. UI/UX 흐름

### 5.1 태스크 생성 플로우 (칸반)

```
[칸반보드]
    ↓ 컬럼 하단 "+" 버튼 클릭
[인라인 입력 필드 활성화]
    ↓ 제목 입력 후 Enter
[태스크 생성] → [낙관적 UI 업데이트]
    ↓
[서버 저장 완료] → [실시간 이벤트 발행]
```

### 5.2 태스크 상세 편집 플로우

```
[태스크 카드 클릭]
    ↓
[태스크 모달 열림]
    ├→ 제목 편집
    ├→ 설명 편집 (Rich Text)
    ├→ 상태 변경 (드롭다운)
    ├→ 우선순위 변경
    ├→ 담당자 변경
    ├→ 마감일 설정 (DatePicker)
    ├→ 부서 선택
    ├→ 체크리스트 관리
    ├→ 첨부파일 업로드
    └→ 댓글 작성
    ↓
[저장] → [모달 닫기] → [목록 업데이트]
```

### 5.3 드래그 앤 드롭 플로우

```
[태스크 카드 드래그 시작]
    ↓
[드래그 중] - 시각적 피드백 (그림자, 투명도)
    ↓
[다른 컬럼/위치에 드롭]
    ↓
[낙관적 UI 업데이트]
    ↓
[updateTasksOrder API 호출]
    ├→ 성공: 토스트 표시, 활동 로그
    └→ 실패: 상태 롤백, 에러 토스트
```

### 5.4 휴지통 플로우

```
[태스크 삭제 버튼 클릭]
    ↓
[확인 다이얼로그]
    ↓ "삭제" 선택
[Soft Delete] → 목록에서 제거
    ↓
[휴지통 페이지 이동]
    ↓
[삭제된 태스크 목록]
    ├→ "복원" → restoreTask → 원래 위치로
    └→ "영구 삭제" → permanentDeleteTask → 완전 삭제
```

---

## 6. 비즈니스 로직

### 6.1 프로젝트 진행률 계산

```typescript
async function updateProjectProgress(projectId: string) {
  // count 쿼리로 최적화 (전체 데이터 로드 방지)
  const [totalCount, completedCount] = await Promise.all([
    prisma.task.count({
      where: { projectId, deletedAt: null }
    }),
    prisma.task.count({
      where: { projectId, deletedAt: null, status: 'done' }
    })
  ])

  const progress = totalCount === 0
    ? 0
    : Math.round((completedCount / totalCount) * 100)

  await prisma.project.update({
    where: { id: projectId },
    data: { progress }
  })
}
```

### 6.2 태스크 권한 검증

| 액션 | Admin | PM | Developer | Designer | Viewer |
|------|-------|-----|-----------|----------|--------|
| 태스크 조회 | O | O | O | O | O |
| 태스크 생성 | O | O | O | O | X |
| 태스크 수정 | O | O | O | O | X |
| 태스크 삭제 | O | O | O | O | X |
| 담당자 변경 | O | O | O | O | X |

### 6.3 상태 전이 규칙

```
backlog ←→ todo ←→ in_progress ←→ review ←→ done
```

- 모든 상태 간 자유롭게 전환 가능
- 칸반 드래그로 상태 자동 변경
- done으로 변경 시 프로젝트 진행률 즉시 업데이트

### 6.4 실시간 이벤트 발행

```typescript
// 이벤트 종류 및 페이로드
'task-created': Task 전체 데이터
'task-updated': Task 전체 데이터
'task-deleted': { id: taskId }
'task-restored': Task 전체 데이터
'tasks-reordered': [{ id, columnId, order }]
```

### 6.5 캐시 무효화 전략

| 이벤트 | 무효화 캐시 |
|--------|-------------|
| 태스크 생성 | `project:${projectId}:tasks`, `dashboard:stats:*` |
| 태스크 수정 | `project:${projectId}:tasks`, `dashboard:stats:*` |
| 태스크 삭제 | `project:${projectId}:tasks`, `dashboard:stats:*` |
| 순서 변경 | `project:${projectId}:tasks`, `dashboard:stats:*` |

---

## 7. QA 테스트 케이스

### 7.1 태스크 생성 테스트

#### TC-TM-001: 기본 태스크 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-001 |
| **테스트명** | 칸반에서 태스크 생성 |
| **사전 조건** | 프로젝트 칸반보드 진입 |
| **테스트 단계** | 1. "할 일" 컬럼 하단 "+" 클릭<br>2. "테스트 태스크" 입력<br>3. Enter 키 |
| **예상 결과** | - 태스크 카드 즉시 표시<br>- 성공 토스트<br>- 새로고침 후에도 유지 |
| **검증 포인트** | - DB에 Task 레코드 생성<br>- status: 'todo'<br>- columnId: 'todo' |

#### TC-TM-002: 빈 제목 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-002 |
| **테스트명** | 빈 제목으로 생성 시도 |
| **테스트 단계** | 1. "+" 클릭<br>2. 빈 상태로 Enter |
| **예상 결과** | - 태스크 생성되지 않음<br>- 입력 필드 포커스 유지 |

#### TC-TM-003: 모달에서 상세 태스크 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-003 |
| **테스트명** | 모든 필드 입력 후 생성 |
| **테스트 단계** | 1. 태스크 생성 모달 열기<br>2. 모든 필드 입력<br>3. 저장 |
| **예상 결과** | - 모든 필드 정상 저장<br>- 담당자, 마감일, 부서 반영 |

### 7.2 태스크 수정 테스트

#### TC-TM-010: 제목 수정

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-010 |
| **테스트명** | 태스크 제목 수정 |
| **테스트 단계** | 1. 태스크 카드 클릭<br>2. 제목 수정<br>3. 저장 |
| **예상 결과** | - 제목 변경 반영<br>- 칸반 카드에 즉시 반영 |

#### TC-TM-011: 상태 변경

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-011 |
| **테스트명** | 상태 드롭다운으로 변경 |
| **테스트 단계** | 1. 모달에서 상태 드롭다운 선택<br>2. "완료" 선택 |
| **예상 결과** | - 상태 변경<br>- 칸반 "완료" 컬럼으로 이동<br>- 프로젝트 진행률 업데이트 |

#### TC-TM-012: 담당자 변경

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-012 |
| **테스트명** | 담당자 할당/변경 |
| **테스트 단계** | 1. 담당자 없는 태스크 선택<br>2. 담당자 선택<br>3. 다른 담당자로 변경 |
| **예상 결과** | - 담당자 아바타 카드에 표시<br>- 할당된 사용자 대시보드에 표시 |

#### TC-TM-013: 마감일 설정

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-013 |
| **테스트명** | 마감일 설정 및 표시 |
| **테스트 단계** | 1. DatePicker로 마감일 선택<br>2. 과거 날짜 선택 시도 |
| **예상 결과** | - 마감일 저장<br>- 카드에 마감일 표시<br>- 지난 마감일은 빨간색 표시 |

### 7.3 드래그 앤 드롭 테스트

#### TC-TM-020: 컬럼 간 이동

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-020 |
| **테스트명** | 칸반 컬럼 간 태스크 이동 |
| **테스트 단계** | 1. "할 일" 태스크를 "진행 중"으로 드래그 |
| **예상 결과** | - 드롭 즉시 UI 업데이트<br>- status: 'in_progress'로 변경<br>- 토스트 표시 |

#### TC-TM-021: 컬럼 내 순서 변경

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-021 |
| **테스트명** | 같은 컬럼 내 순서 변경 |
| **테스트 단계** | 1. 같은 컬럼 내에서 태스크 순서 변경 |
| **예상 결과** | - order 값 업데이트<br>- 새로고침 후 순서 유지 |

#### TC-TM-022: 실시간 동기화

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-022 |
| **테스트명** | 다른 사용자 변경 실시간 반영 |
| **사전 조건** | 2개 브라우저로 같은 보드 열기 |
| **테스트 단계** | 1. 브라우저 A에서 태스크 이동<br>2. 브라우저 B 확인 |
| **예상 결과** | - B에서 자동 업데이트<br>- 별도 새로고침 불필요 |

### 7.4 삭제 및 휴지통 테스트

#### TC-TM-030: Soft Delete

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-030 |
| **테스트명** | 태스크 삭제 (휴지통 이동) |
| **테스트 단계** | 1. 태스크 삭제 버튼 클릭<br>2. 확인 다이얼로그에서 "삭제" |
| **예상 결과** | - 목록에서 제거<br>- deletedAt 설정<br>- 휴지통에서 조회 가능 |

#### TC-TM-031: 태스크 복원

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-031 |
| **테스트명** | 휴지통에서 복원 |
| **테스트 단계** | 1. 휴지통 이동<br>2. 태스크 "복원" 클릭 |
| **예상 결과** | - 원래 프로젝트로 복귀<br>- deletedAt null로 설정<br>- 칸반에 다시 표시 |

#### TC-TM-032: 영구 삭제

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-032 |
| **테스트명** | 영구 삭제 |
| **테스트 단계** | 1. 휴지통에서 "영구 삭제" 클릭<br>2. 확인 다이얼로그 |
| **예상 결과** | - DB에서 완전 삭제<br>- 복구 불가 |

#### TC-TM-033: 휴지통 비우기

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-033 |
| **테스트명** | 휴지통 전체 비우기 |
| **테스트 단계** | 1. "휴지통 비우기" 클릭 |
| **예상 결과** | - 모든 삭제 태스크 영구 삭제<br>- 휴지통 빈 상태 |

### 7.5 체크리스트 테스트

#### TC-TM-040: 체크리스트 항목 추가

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-040 |
| **테스트명** | 체크리스트 항목 추가 |
| **테스트 단계** | 1. 태스크 모달 열기<br>2. 체크리스트 항목 입력<br>3. Enter |
| **예상 결과** | - 항목 추가<br>- 완료되지 않은 상태로 표시 |

#### TC-TM-041: 체크리스트 완료 토글

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-041 |
| **테스트명** | 체크리스트 항목 완료/미완료 |
| **테스트 단계** | 1. 체크박스 클릭<br>2. 다시 클릭 |
| **예상 결과** | - 완료 상태 토글<br>- 취소선 표시/제거 |

### 7.6 첨부파일 테스트

#### TC-TM-050: 파일 업로드

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-050 |
| **테스트명** | 첨부파일 업로드 |
| **테스트 단계** | 1. 파일 첨부 버튼 클릭<br>2. 파일 선택<br>3. 업로드 완료 대기 |
| **예상 결과** | - 파일 목록에 표시<br>- 파일명, 크기 표시<br>- 다운로드 가능 |

#### TC-TM-051: 파일 형식 제한

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-051 |
| **테스트명** | 허용되지 않은 파일 형식 |
| **테스트 단계** | 1. .exe 파일 업로드 시도 |
| **예상 결과** | - 업로드 거부<br>- 에러 메시지 표시 |

### 7.7 댓글 테스트

#### TC-TM-060: 댓글 작성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-060 |
| **테스트명** | 댓글 작성 |
| **테스트 단계** | 1. 댓글 입력<br>2. 전송 버튼 클릭 |
| **예상 결과** | - 댓글 목록에 표시<br>- 작성자 정보 표시<br>- 시간 표시 |

#### TC-TM-061: 빈 댓글 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-061 |
| **테스트명** | 빈 댓글 전송 시도 |
| **테스트 단계** | 1. 빈 상태로 전송 버튼 클릭 |
| **예상 결과** | - 전송되지 않음<br>- 검증 메시지 표시 |

### 7.8 에러 처리 테스트

#### TC-TM-070: 네트워크 오류 복구

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-070 |
| **테스트명** | 오프라인 상태에서 작업 시도 |
| **테스트 단계** | 1. 네트워크 끊기<br>2. 태스크 이동 시도 |
| **예상 결과** | - 오프라인 표시<br>- 에러 토스트<br>- 상태 롤백 |

#### TC-TM-071: 동시 편집 충돌

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-TM-071 |
| **테스트명** | 동시 수정 시 처리 |
| **테스트 단계** | 1. 두 사용자가 같은 태스크 수정 |
| **예상 결과** | - 마지막 저장 우선<br>- 실시간 업데이트 반영 |

---

## 부록

### A. Server Actions 목록

| 함수 | 설명 |
|------|------|
| `getTasks` | 프로젝트 태스크 조회 |
| `getAllTasks` | 전체 태스크 조회 |
| `createTask` | 태스크 생성 |
| `updateTask` | 태스크 수정 |
| `deleteTask` | 태스크 삭제 (soft) |
| `restoreTask` | 태스크 복원 |
| `permanentDeleteTask` | 영구 삭제 |
| `getTrashedTasks` | 휴지통 조회 |
| `emptyTrash` | 휴지통 비우기 |
| `updateTasksOrder` | 순서 변경 |

### B. 실시간 이벤트 목록

| 이벤트 | 발생 시점 | 페이로드 |
|--------|----------|----------|
| `task-created` | 태스크 생성 | Task 전체 |
| `task-updated` | 태스크 수정 | Task 전체 |
| `task-deleted` | 태스크 삭제 | { id } |
| `task-restored` | 태스크 복원 | Task 전체 |
| `tasks-reordered` | 순서 변경 | [{ id, columnId, order }] |

### C. 캐시 키 패턴

| 키 패턴 | TTL | 설명 |
|---------|-----|------|
| `project:${projectId}:tasks` | 60초 | 프로젝트 태스크 |
| `dashboard:stats:*` | 5분 | 대시보드 통계 |
