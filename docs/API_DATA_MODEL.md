# CodeB Platform - API & 데이터 모델 문서

## 📋 목차
- [API 개요](#api-개요)
- [인증](#인증)
- [API 엔드포인트](#api-엔드포인트)
- [데이터 모델](#데이터-모델)
- [에러 처리](#에러-처리)
- [Rate Limiting](#rate-limiting)

---

## API 개요

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### 인증 방식
- Firebase Authentication ID Token
- Bearer Token in Authorization Header

### 응답 형식
```typescript
// 성공 응답
{
  "success": true,
  "data": {...},
  "message": "성공 메시지"
}

// 에러 응답
{
  "success": false,
  "error": "에러 메시지",
  "code": "ERROR_CODE"
}
```

---

## 인증

### Headers
모든 API 요청에는 Firebase ID Token이 필요합니다:

```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

### 권한 레벨
```typescript
type UserRole = 'admin' | 'member';

const rolePermissions = {
  admin: {
    projects: 'full',      // 모든 프로젝트 접근
    users: 'manage',       // 사용자 관리
    settings: 'manage'     // 시스템 설정
  },
  member: {
    projects: 'assigned',  // 할당된 프로젝트만
    users: 'view',         // 사용자 조회만
    settings: 'none'       // 설정 접근 불가
  }
};
```

---

## API 엔드포인트

### 1. 근태 관리 (Attendance)

#### POST /api/attendance/checkin
출근 체크인

**Request:**
```typescript
{
  workspaceId: string;
  userId: string;
  location?: {
    lat: number;
    lng: number;
  };
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: string;
    userId: string;
    checkInTime: Date;
    status: 'checked_in';
  }
}
```

#### POST /api/attendance/checkout
퇴근 체크아웃

**Request:**
```typescript
{
  attendanceId: string;
  userId: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    id: string;
    checkOutTime: Date;
    workHours: number;
    status: 'checked_out';
  }
}
```

#### GET /api/attendance?userId={userId}&month={YYYY-MM}
근태 기록 조회

**Response:**
```typescript
{
  success: true;
  data: {
    records: AttendanceRecord[];
    summary: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
    }
  }
}
```

---

### 2. 보드 (Board)

#### GET /api/board?workspaceId={workspaceId}
보드 목록 조회

**Response:**
```typescript
{
  success: true;
  data: {
    boards: Board[];
  }
}
```

#### POST /api/board
보드 생성

**Request:**
```typescript
{
  workspaceId: string;
  name: string;
  description?: string;
  columns: {
    id: string;
    title: string;
    order: number;
  }[];
}
```

---

### 3. 계약 (Contracts)

#### GET /api/contracts
계약 목록 조회

**Response:**
```typescript
{
  success: true;
  data: {
    contracts: Contract[];
    total: number;
  }
}
```

#### POST /api/contracts
계약 생성

**Request:**
```typescript
{
  clientId: string;
  projectId?: string;
  title: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  terms: string;
  paymentTerms: string;
}
```

---

### 4. 휴가 (Leave)

#### GET /api/leave?userId={userId}
휴가 신청 내역 조회

**Response:**
```typescript
{
  success: true;
  data: {
    leaves: LeaveRequest[];
    summary: {
      totalDays: number;
      usedDays: number;
      remainingDays: number;
    }
  }
}
```

#### POST /api/leave
휴가 신청

**Request:**
```typescript
{
  userId: string;
  leaveType: 'annual' | 'sick' | 'personal';
  startDate: Date;
  endDate: Date;
  reason: string;
}
```

---

### 5. 프로젝트 (Projects)

#### GET /api/projects
프로젝트 목록 조회

**Query Parameters:**
- `status`: 'planning' | 'development' | 'completed'
- `clientId`: 거래처 ID 필터
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 20)

**Response:**
```typescript
{
  success: true;
  data: {
    projects: Project[];
    total: number;
    page: number;
    totalPages: number;
  }
}
```

#### GET /api/projects/[id]
프로젝트 상세 조회

**Response:**
```typescript
{
  success: true;
  data: {
    project: Project;
    tasks: Task[];
    members: ProjectMember[];
  }
}
```

#### POST /api/projects
프로젝트 생성

**Request:**
```typescript
{
  name: string;
  description: string;
  clientId: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  team: {
    userId: string;
    role: string;
  }[];
  visibility: 'public' | 'private' | 'client';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}
```

#### PATCH /api/projects/[id]
프로젝트 수정

**Request:**
```typescript
{
  name?: string;
  description?: string;
  status?: 'planning' | 'design' | 'development' | 'testing' | 'completed';
  progress?: number;
  budget?: number;
  team?: ProjectMember[];
}
```

#### DELETE /api/projects/[id]
프로젝트 삭제

---

### 6. 프로젝트 태스크 (Project Tasks)

#### GET /api/projects/[id]/tasks
프로젝트의 모든 태스크 조회

**Response:**
```typescript
{
  success: true;
  data: {
    tasks: Task[];
    summary: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
    }
  }
}
```

#### POST /api/projects/[id]/tasks
태스크 생성

**Request:**
```typescript
{
  title: string;
  description?: string;
  assigneeId?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
}
```

---

### 7. 마인드맵 (Mindmap)

#### POST /api/projects/[id]/mindmap/convert
마인드맵을 태스크로 변환

**Request:**
```typescript
{
  mindmapData: {
    nodes: MindmapNode[];
    edges: MindmapEdge[];
  };
  options?: {
    createSubtasks: boolean;
    preserveHierarchy: boolean;
  }
}
```

---

### 8. 워크스페이스 (Workspace)

#### GET /api/workspace/current
현재 워크스페이스 정보 조회

**Response:**
```typescript
{
  success: true;
  data: {
    workspace: Workspace;
    members: WorkspaceMember[];
    projects: Project[];
  }
}
```

#### POST /api/workspace/current/invite
워크스페이스 멤버 초대

**Request:**
```typescript
{
  email: string;
  role: 'admin' | 'member' | 'viewer';
  message?: string;
}
```

#### GET /api/workspace/current/members
워크스페이스 멤버 목록

**Response:**
```typescript
{
  success: true;
  data: {
    members: WorkspaceMember[];
    total: number;
  }
}
```

#### DELETE /api/workspace/current/members/[id]
워크스페이스 멤버 제거

---

### 9. 거래 (Transactions)

#### GET /api/transactions
거래 내역 조회

**Query Parameters:**
- `type`: 'income' | 'expense'
- `startDate`: 시작 날짜
- `endDate`: 종료 날짜
- `projectId`: 프로젝트 ID 필터

**Response:**
```typescript
{
  success: true;
  data: {
    transactions: Transaction[];
    summary: {
      totalIncome: number;
      totalExpense: number;
      netProfit: number;
    }
  }
}
```

#### POST /api/transactions
거래 생성

**Request:**
```typescript
{
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  projectId?: string;
  date: Date;
}
```

---

## 데이터 모델

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  department?: string;
  permissions?: {
    projects: string[];
    canCreateProject?: boolean;
    canManageUsers?: boolean;
    canViewAllProjects?: boolean;
  };
  avatar?: string;
  phoneNumber?: string;
  companyName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientName?: string;
  status: 'planning' | 'design' | 'development' | 'testing' | 'completed' | 'pending';
  progress: number;
  startDate: Date;
  endDate: Date;
  team: ProjectMember[];
  budget: number;
  visibility: 'public' | 'private' | 'client';
  permissions: {
    viewerIds: string[];
    editorIds: string[];
    adminIds: string[];
  };
  tags?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  assigneeName?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  checklist?: ChecklistItem[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  dependencies?: string[]; // 의존 태스크 ID
  progress: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### AttendanceRecord
```typescript
interface AttendanceRecord {
  id: string;
  userId: string;
  workspaceId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  workHours?: number;
  status: 'checked_in' | 'checked_out' | 'absent' | 'late';
  location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### LeaveRequest
```typescript
interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity';
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Contract
```typescript
interface Contract {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  contractNumber: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  terms: string;
  paymentTerms: string;
  status: 'draft' | 'active' | 'completed' | 'terminated';
  documents?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: {
    allowGuestAccess: boolean;
    defaultProjectVisibility: 'public' | 'private';
    requireApprovalForLeave: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkspaceMember
```typescript
interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  invitedBy?: string;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  workspaceId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  projectId?: string;
  date: Date;
  receipt?: string; // 영수증 URL
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 에러 처리

### 에러 코드
```typescript
const ERROR_CODES = {
  // 인증 에러 (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // 권한 에러 (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // 요청 에러 (400)
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // 리소스 에러 (404)
  NOT_FOUND: 'NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // 충돌 에러 (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // 서버 에러 (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
};
```

### 에러 응답 예시
```typescript
{
  "success": false,
  "error": "프로젝트를 찾을 수 없습니다",
  "code": "PROJECT_NOT_FOUND",
  "details": {
    "projectId": "abc123"
  }
}
```

---

## Rate Limiting

### 제한 정책
```typescript
const RATE_LIMITS = {
  // 일반 API
  default: {
    windowMs: 60 * 1000,      // 1분
    max: 100                   // 100 requests
  },

  // 인증 API
  auth: {
    windowMs: 15 * 60 * 1000, // 15분
    max: 5                     // 5 requests
  },

  // 파일 업로드
  upload: {
    windowMs: 60 * 1000,      // 1분
    max: 10                    // 10 requests
  }
};
```

### Rate Limit 초과 응답
```typescript
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60 // 초 단위
}
```

---

## Webhook (향후 지원 예정)

### 이벤트 타입
```typescript
type WebhookEvent =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'member.added'
  | 'member.removed';
```

### Webhook Payload
```typescript
{
  event: WebhookEvent;
  timestamp: Date;
  data: {
    // 이벤트별 데이터
  };
  workspaceId: string;
}
```

---

**문서 버전**: 1.0.0
**최종 업데이트**: 2025-01-24
**작성자**: CodeB Development Team
