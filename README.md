# CodeB Platform - 통합 비즈니스 관리 플랫폼

**Next.js 14 + Prisma + PostgreSQL 기반의 현대적인 프로젝트 관리 및 협업 플랫폼**

[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791)](https://www.postgresql.org/)

---

## 🚀 핵심 기능

### 📊 프로젝트 관리
- **프로젝트 생성 마법사**: 단계별 가이드로 쉬운 프로젝트 생성
- **다중 뷰 지원**: 리스트, 칸반, 간트 차트, 마인드맵
- **실시간 진행률 추적**: 자동 계산되는 프로젝트 진척도
- **팀 협업**: 역할 기반 팀원 관리 및 권한 제어

### ✅ 작업 관리
- **칸반 보드**: 드래그 앤 드롭으로 작업 상태 관리
- **간트 차트**: 일정 시각화 및 의존성 관리
- **마인드맵 → 태스크 변환**: 아이디어를 실행 가능한 작업으로 자동 변환
- **체크리스트 & 첨부파일**: 세부 작업 관리

### 💼 워크스페이스
- **멀티 워크스페이스**: 여러 조직/팀 관리
- **보드 & 캘린더**: 작업 시각화
- **실시간 협업**: Socket.io 기반 실시간 업데이트

### 👥 그룹웨어
- **근태 관리**: 출퇴근 체크 및 근무 시간 추적
- **휴가 신청**: 결재 워크플로우 통합
- **조직도**: 부서 및 팀 구조 관리
- **공지사항**: 전사 소통 플랫폼

### 💰 재무 관리
- **계약 관리**: 계약서 관리 및 상태 추적
- **수입/지출 관리**: 거래 내역 기록
- **손익계산서**: 프로젝트별 재무 현황

### 🤖 AI 어시스턴트
- **프로젝트 인사이트**: Google Gemini 기반 AI 분석
- **작업 추천**: 스마트 작업 우선순위 제안
- **리스크 분석**: 프로젝트 위험 요소 탐지

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14.1.0 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI, Shadcn/ui
- **Animation**: Framer Motion
- **State**: Zustand, React Context API
- **Forms**: React Hook Form

### Backend
- **ORM**: Prisma 5.10
- **Database**: PostgreSQL 14+
- **Cache**: Redis (ioredis)
- **Real-time**: Socket.io 4.8
- **API**: Next.js API Routes + Server Actions

### AI & Analytics
- **AI**: Google Gemini API
- **Charts**: Recharts 2.10
- **Visualization**: D3-based charts

### Development
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Package Manager**: npm

---

## 📦 빠른 시작

### 1. 사전 요구사항

\`\`\`bash
Node.js >= 18.17.0
PostgreSQL >= 14.x
npm >= 9.0.0
\`\`\`

### 2. 설치

\`\`\`bash
# 저장소 클론
git clone https://github.com/your-org/codeb-platform.git
cd codeb-platform

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 수정

# 데이터베이스 설정
npx prisma migrate dev --name init
npx prisma generate

# 개발 서버 실행
npm run dev
\`\`\`

### 3. 접속

- **Frontend**: http://localhost:3000
- **Prisma Studio**: \`npx prisma studio\` → http://localhost:5555

---

## 📁 프로젝트 구조

\`\`\`
codeb-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 인증 페이지
│   │   ├── (dashboard)/       # 메인 대시보드
│   │   └── api/               # API 라우트
│   ├── components/            # React 컴포넌트
│   │   ├── ui/               # 기본 UI
│   │   ├── layout/           # 레이아웃
│   │   ├── projects/         # 프로젝트 관련
│   │   ├── kanban/           # 칸반 보드
│   │   ├── gantt/            # 간트 차트
│   │   └── ...
│   ├── lib/                   # 유틸리티 & 설정
│   ├── services/              # 비즈니스 로직
│   ├── actions/               # Server Actions
│   ├── hooks/                 # Custom Hooks
│   └── types/                 # TypeScript 타입
├── prisma/
│   ├── schema.prisma          # 데이터베이스 스키마
│   ├── migrations/            # 마이그레이션
│   └── seed.ts               # 시드 데이터
├── docs/                      # 문서
│   ├── ARCHITECTURE.md
│   ├── API_DATA_MODEL.md
│   └── DEVELOPMENT_GUIDE.md
└── package.json
\`\`\`

---

## 📚 주요 페이지

### 인증
- \`/login\` - 로그인

### 대시보드
- \`/dashboard\` - 메인 대시보드
- \`/projects\` - 프로젝트 목록
- \`/projects/[id]\` - 프로젝트 상세
- \`/tasks\` - 작업 관리
- \`/gantt\` - 전역 간트 차트
- \`/users\` - 사용자 관리

### 워크스페이스
- \`/workspace/board\` - 보드 뷰
- \`/workspace/calendar\` - 캘린더
- \`/workspace/mindmap\` - 마인드맵

### 그룹웨어
- \`/groupware/attendance\` - 근태 관리
- \`/groupware/leave\` - 휴가 관리
- \`/groupware/organization\` - 조직도
- \`/groupware/announcement\` - 공지사항

### 재무
- \`/finance/contracts\` - 계약 관리
- \`/finance/pl\` - 손익계산서

### 기타
- \`/messages\` - 메시지
- \`/files\` - 파일 관리
- \`/automation\` - 자동화

---

## 🔐 데이터베이스 스키마

주요 모델:

\`\`\`prisma
model Workspace {
  id          String
  name        String
  plan        String
  members     WorkspaceMember[]
  projects    Project[]
  // ...
}

model Project {
  id          String
  name        String
  status      ProjectStatus
  priority    ProjectPriority
  team        ProjectMember[]
  tasks       Task[]
  // ...
}

model Task {
  id          String
  title       String
  status      TaskStatus
  priority    TaskPriority
  assignee    User
  checklist   ChecklistItem[]
  // ...
}
\`\`\`

전체 스키마는 \`prisma/schema.prisma\` 참조

---

## 🧪 테스트

\`\`\`bash
# 단위 테스트
npm test

# 테스트 워치 모드
npm run test:watch

# 커버리지
npm run test:coverage
\`\`\`

---

## 🚢 배포

### Vercel (권장)

\`\`\`bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션
vercel --prod
\`\`\`

### Docker

\`\`\`bash
# 모든 서비스 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
\`\`\`

---

## 📖 문서

- [아키텍처 가이드](./docs/ARCHITECTURE.md)
- [개발 가이드](./docs/DEVELOPMENT_GUIDE.md)
- [API 문서](./docs/API_DATA_MODEL.md)
- [설치 가이드](./SETUP.md)
- [컴포넌트 가이드](./docs/COMPONENTS.md)
- [배포 가이드](./docs/DEPLOYMENT_GUIDE.md)

---

## 🤝 기여하기

1. Fork the repository
2. Create feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit changes (\`git commit -m 'feat: Add AmazingFeature'\`)
4. Push to branch (\`git push origin feature/AmazingFeature\`)
5. Open Pull Request

---

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 참조

---

## 👥 개발팀

**CodeB Development Team**

- 프로젝트 관리
- 풀스택 개발
- UI/UX 디자인

---

## 📞 연락처

- **Email**: support@codeb.com
- **Website**: https://codeb.com
- **Documentation**: https://docs.codeb.com

---

**Made with ❤️ by CodeB Team**
