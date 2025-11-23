# CodeB Platform - 설치 가이드

## 📋 목차
- [시스템 요구사항](#시스템-요구사항)
- [초기 설정](#초기-설정)
- [데이터베이스 설정](#데이터베이스-설정)
- [개발 서버 실행](#개발-서버-실행)
- [프로덕션 배포](#프로덕션-배포)
- [문제 해결](#문제-해결)

---

## 시스템 요구사항

### 필수
- **Node.js**: 18.17.0 이상
- **npm**: 9.0.0 이상
- **PostgreSQL**: 14.x 이상
- **Git**: 최신 버전

### 선택사항
- **Redis**: 7.x (캐싱 및 세션 관리)
- **Docker**: 최신 버전 (컨테이너 환경)

---

## 초기 설정

### 1. 저장소 클론

\`\`\`bash
git clone https://github.com/your-org/codeb-platform.git
cd codeb-platform
\`\`\`

### 2. 의존성 설치

\`\`\`bash
npm install
\`\`\`

### 3. 환경 변수 설정

프로젝트 루트에 \`.env.local\` 파일 생성:

\`\`\`env
# ===== 데이터베이스 =====
DATABASE_URL="postgresql://codeb_user:your_password@localhost:5432/codeb?schema=public"

# ===== Google AI (Gemini) =====
GOOGLE_AI_API_KEY=your_gemini_api_key

# ===== Redis (선택사항) =====
REDIS_URL=redis://localhost:6379

# ===== Next.js =====
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ===== 보안 =====
NEXTAUTH_SECRET=your_nextauth_secret_key_here
NEXTAUTH_URL=http://localhost:3000
\`\`\`

---

## 데이터베이스 설정

### PostgreSQL 설치

#### macOS (Homebrew)
\`\`\`bash
brew install postgresql@14
brew services start postgresql@14
\`\`\`

#### Ubuntu/Debian
\`\`\`bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
\`\`\`

#### Windows
[PostgreSQL 공식 사이트](https://www.postgresql.org/download/windows/)에서 설치

### 데이터베이스 및 사용자 생성

\`\`\`bash
# PostgreSQL 접속
sudo -u postgres psql

# 데이터베이스 사용자 생성
CREATE USER codeb_user WITH PASSWORD 'your_password';

# 데이터베이스 생성
CREATE DATABASE codeb OWNER codeb_user;

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE codeb TO codeb_user;

# 종료
\\q
\`\`\`

### Prisma 마이그레이션 실행

\`\`\`bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev --name init

# 시드 데이터 추가 (선택사항)
npx prisma db seed
\`\`\`

### Prisma Studio로 데이터 확인

\`\`\`bash
npx prisma studio
\`\`\`

브라우저에서 http://localhost:5555 접속

---

## 개발 서버 실행

### Next.js 개발 서버

\`\`\`bash
npm run dev
\`\`\`

### Socket.io 포함 실행

\`\`\`bash
npm run dev:all
\`\`\`

### 접속

- **Frontend**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555

---

## 프로덕션 배포

### 1. 빌드 전 체크리스트

\`\`\`bash
# 타입 체크
npm run type-check

# 린트
npm run lint

# 테스트
npm test

# Prisma 클라이언트 생성
npx prisma generate
\`\`\`

### 2. 프로덕션 빌드

\`\`\`bash
npm run build
\`\`\`

### 3. 프로덕션 서버 실행

\`\`\`bash
# 마이그레이션 실행
npx prisma migrate deploy

# 서버 시작
npm start
\`\`\`

### 4. Vercel 배포

#### Vercel CLI 사용

\`\`\`bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
\`\`\`

#### 환경 변수 설정 (Vercel Dashboard)

1. Vercel Dashboard 접속
2. Project Settings → Environment Variables
3. 다음 변수 추가:
   - \`DATABASE_URL\`
   - \`GOOGLE_AI_API_KEY\`
   - \`REDIS_URL\`
   - \`NEXTAUTH_SECRET\`
   - \`NEXTAUTH_URL\`

---

## 문제 해결

### 데이터베이스 연결 실패

**증상**: \`Can't reach database server\`

**해결방법**:
\`\`\`bash
# PostgreSQL 실행 확인
sudo systemctl status postgresql

# PostgreSQL 재시작
sudo systemctl restart postgresql

# DATABASE_URL 확인
echo $DATABASE_URL
\`\`\`

### Prisma 마이그레이션 실패

**증상**: \`Migration failed\`

**해결방법**:
\`\`\`bash
# 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 리셋 (주의: 데이터 손실)
npx prisma migrate reset

# 다시 마이그레이션
npx prisma migrate dev
\`\`\`

### 포트 충돌

**증상**: \`Port 3000 is already in use\`

**해결방법**:
\`\`\`bash
# 프로세스 종료 (macOS/Linux)
lsof -ti:3000 | xargs kill

# 다른 포트 사용
npm run dev -- -p 3002
\`\`\`

### TypeScript 에러

**증상**: \`Type errors\`

**해결방법**:
\`\`\`bash
# Prisma 클라이언트 재생성
npx prisma generate

# 타입 체크
npm run type-check

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
\`\`\`

---

## Docker로 실행 (선택사항)

### docker-compose.yml 사용

\`\`\`bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 종료
docker-compose down
\`\`\`

---

## 추가 도구 설정

### VS Code 확장 프로그램 권장

- **Prisma**: Prisma 스키마 지원
- **ESLint**: 코드 린팅
- **Prettier**: 코드 포맷팅
- **Tailwind CSS IntelliSense**: Tailwind 자동완성
- **TypeScript**: TypeScript 지원

### Git Hooks 설정 (선택사항)

\`\`\`bash
# Husky 설치
npm install -D husky
npx husky install

# Pre-commit hook 추가
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
\`\`\`

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025-01-24  
**작성자**: CodeB Development Team
