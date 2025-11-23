# CodeB Platform - 개발 가이드

## 📋 목차
- [개발 환경 설정](#개발-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [개발 워크플로우](#개발-워크플로우)
- [코딩 컨벤션](#코딩-컨벤션)
- [컴포넌트 개발](#컴포넌트-개발)
- [API 개발](#api-개발)
- [데이터베이스 작업](#데이터베이스-작업)
- [상태 관리](#상태-관리)
- [테스트](#테스트)
- [디버깅](#디버깅)
- [배포](#배포)

---

## 개발 환경 설정

### 필수 요구사항
- Node.js 18.x 이상
- npm 9.x 이상
- PostgreSQL 14.x 이상
- Redis 7.x (선택사항, 캐싱용)
- Git
- 코드 에디터 (VS Code 권장)

### 1. 프로젝트 클론 및 설치

\`\`\`bash
# 저장소 클론
git clone https://github.com/your-org/codeb-platform.git
cd codeb-platform

# 의존성 설치
npm install
\`\`\`

### 2. 환경 변수 설정

\`.env.local\` 파일 생성:

\`\`\`env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/codeb?schema=public"

# Google AI
GOOGLE_AI_API_KEY=your_gemini_api_key

# Redis (선택사항)
REDIS_URL=redis://localhost:6379

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 3. 데이터베이스 설정

#### PostgreSQL 설치 및 설정

\`\`\`bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# 데이터베이스 생성
createdb codeb

# 또는 psql로
psql postgres
CREATE DATABASE codeb;
\\q
\`\`\`

#### Prisma 설정

\`\`\`bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma Studio 실행 (데이터베이스 GUI)
npx prisma studio
\`\`\`

### 4. 개발 서버 실행

\`\`\`bash
# Next.js 개발 서버만
npm run dev

# Next.js + Socket.io 서버 동시 실행
npm run dev:all
\`\`\`

서버 접속:
- Frontend: http://localhost:3000
- Prisma Studio: http://localhost:5555

---

## 프로젝트 구조

### 디렉토리 구조
\`\`\`
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 인증 라우트 그룹
│   ├── (dashboard)/         # 대시보드 라우트 그룹
│   ├── api/                 # API Routes
│   ├── layout.tsx           # 루트 레이아웃
│   └── page.tsx             # 홈페이지
│
├── components/              # React 컴포넌트
│   ├── ui/                  # 기본 UI 컴포넌트
│   ├── layout/              # 레이아웃 컴포넌트
│   ├── dashboard/           # 대시보드 컴포넌트
│   └── ...                  # 도메인별 컴포넌트
│
├── lib/                     # 핵심 라이브러리
│   ├── prisma.ts            # Prisma 클라이언트
│   ├── auth-context.tsx     # 인증 컨텍스트
│   └── redis.ts             # Redis 클라이언트
│
├── services/                # 비즈니스 로직
│   ├── ai-service.ts        # AI 서비스
│   └── notification-service.ts
│
├── actions/                 # Server Actions
│   ├── project-actions.ts
│   ├── task-actions.ts
│   └── user-actions.ts
│
├── hooks/                   # Custom React Hooks
│   └── useProjectTasks.ts
│
└── types/                   # TypeScript 타입
    ├── index.ts
    └── task.ts

prisma/
├── schema.prisma            # 데이터베이스 스키마
├── migrations/              # 마이그레이션 파일
└── seed.ts                  # 시드 데이터
\`\`\`

---

## 개발 워크플로우

### 1. 기능 개발 프로세스

\`\`\`bash
# 1. 최신 코드 가져오기
git checkout main
git pull origin main

# 2. 새 브랜치 생성
git checkout -b feature/new-feature-name

# 3. 개발 진행
# - 스키마 변경 시 마이그레이션 생성
npx prisma migrate dev --name add_new_feature

# - 코드 작성
# - 테스트 작성
# - 린트 체크

# 4. 커밋
git add .
git commit -m "feat: Add new feature description"

# 5. 푸시 및 PR 생성
git push origin feature/new-feature-name
\`\`\`

### 2. 데이터베이스 스키마 변경 워크플로우

\`\`\`bash
# 1. schema.prisma 파일 수정

# 2. 마이그레이션 생성
npx prisma migrate dev --name descriptive_name

# 3. Prisma 클라이언트 재생성 (자동 실행됨)
npx prisma generate

# 4. 타입 체크
npm run type-check
\`\`\`

---

## 유용한 명령어

\`\`\`bash
# 개발
npm run dev              # 개발 서버
npm run dev:all          # 개발 서버 + Socket.io

# Prisma
npx prisma studio        # 데이터베이스 GUI
npx prisma generate      # 클라이언트 생성
npx prisma migrate dev   # 마이그레이션 실행
npx prisma migrate deploy # 프로덕션 마이그레이션
npx prisma db push       # 스키마 푸시 (마이그레이션 없이)
npx prisma db seed       # 시드 데이터 실행

# 빌드
npm run build            # 프로덕션 빌드
npm start                # 프로덕션 서버

# 코드 품질
npm run lint             # ESLint 실행
npm run type-check       # TypeScript 체크

# 테스트
npm test                 # 테스트 실행
npm run test:watch       # 테스트 워치 모드
npm run test:coverage    # 커버리지 리포트
\`\`\`

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025-01-24  
**작성자**: CodeB Development Team
