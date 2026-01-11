---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, Task, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_take_screenshot, mcp__sequential-thinking__sequentialthinking]
description: "Playwright 기반 E2E 테스트 실행 및 관리"
---

# /we:test - E2E 테스트

## 목적
Playwright 기반 E2E 테스트를 실행하고 관리합니다:
- 테스트 구조 초기화
- 크로스 브라우저 테스트 실행
- Staging/Production 환경 테스트
- 테스트 리포트 생성

## 중요 규칙
- **모든 응답은 한글로 작성**
- 테스트 실패 시 상세 에러 리포트 제공
- CI 환경에서는 자동으로 headless 모드

## 사용법
```bash
/we:test [액션] [옵션]
```

## 액션
- `run` - 테스트 실행 (기본값)
- `init` - 테스트 구조 초기화
- `report` - 테스트 리포트 열기
- `staging` - Staging 환경 테스트
- `ci` - CI/CD용 테스트 실행

## 주요 옵션

### 실행 옵션
- `--headed` - 브라우저 UI 표시
- `--debug` - 디버그 모드
- `--ui` - Playwright UI 모드

### 브라우저 옵션
- `-p, --project <name>` - 특정 브라우저 (chromium, firefox, webkit)

### 필터 옵션
- `-g, --grep <pattern>` - 패턴과 일치하는 테스트만 실행

### 병렬 옵션
- `-w, --workers <count>` - 병렬 워커 수
- `-r, --retries <count>` - 실패 시 재시도 횟수

### 환경 옵션
- `--staging` - Staging 환경 테스트
- `--production` - Production 환경 테스트
- `--project-name <name>` - 프로젝트 이름

## 예제

### 테스트 초기화
```bash
/we:test init
```

### 기본 테스트 실행
```bash
/we:test run
```

### UI 모드로 실행
```bash
/we:test run --ui
```

### 디버그 모드
```bash
/we:test run --debug
```

### Chrome만 테스트
```bash
/we:test run --project chromium
```

### 특정 테스트만 실행
```bash
/we:test run --grep "homepage"
```

### Staging 환경 테스트
```bash
/we:test staging --project-name my-app
```

### CI/CD 모드
```bash
/we:test ci
```

### 테스트 리포트 보기
```bash
/we:test report
```

## 생성되는 테스트 구조

```
tests/
├── e2e/
│   ├── homepage.spec.ts    # 기본 페이지 테스트
│   ├── auth.spec.ts        # 인증 플로우 테스트
│   ├── api.spec.ts         # API 엔드포인트 테스트
│   └── performance.spec.ts # 성능 테스트
playwright.config.ts         # Playwright 설정
```

## 테스트 프로젝트 (브라우저)

| 프로젝트 | 설명 |
|---------|------|
| chromium | Chrome/Edge 데스크톱 |
| firefox | Firefox 데스크톱 |
| webkit | Safari 데스크톱 |
| mobile-chrome | Pixel 5 모바일 |
| mobile-safari | iPhone 12 모바일 |

## CI/CD 통합

### GitHub Actions 설정
```yaml
- name: Run E2E Tests
  run: npx we-cli test ci
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
```

### 테스트 리포트 아티팩트
```yaml
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: test-results/
```

## 7-Agent 연동

이 명령어는 `e2e-test-strategist` 에이전트와 연동됩니다:

```bash
# 테스트 전략 수립
/we:agent e2e-test-strategist "사용자 인증 플로우 테스트 설계"

# 테스트 시나리오 생성
/we:agent e2e-test-strategist "결제 프로세스 E2E 테스트 케이스 작성"
```

### 에이전트 활용 시나리오

1. **테스트 설계 요청**
   ```bash
   /we:agent e2e-test-strategist "주요 사용자 플로우 분석 및 테스트 계획 수립"
   ```

2. **테스트 케이스 생성**
   ```bash
   /we:agent e2e-test-strategist "회원가입 → 로그인 → 프로필 수정 플로우 테스트 작성"
   ```

3. **테스트 실행 및 분석**
   ```bash
   /we:test run
   /we:agent e2e-test-strategist "테스트 실패 원인 분석 및 개선 방안"
   ```

## MCP 연동

### Playwright MCP 도구
- `mcp__playwright__browser_navigate` - 페이지 이동
- `mcp__playwright__browser_snapshot` - 접근성 스냅샷
- `mcp__playwright__browser_click` - 클릭 액션
- `mcp__playwright__browser_type` - 텍스트 입력
- `mcp__playwright__browser_take_screenshot` - 스크린샷

### Sequential Thinking MCP
- `mcp__sequential-thinking__sequentialthinking` - 테스트 전략 분석

## 테스트 작성 가이드

### 기본 테스트 구조
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### API 테스트
```typescript
test('API endpoint', async ({ request }) => {
  const response = await request.get('/api/endpoint');
  expect(response.ok()).toBeTruthy();
});
```

### 성능 테스트
```typescript
test('page load performance', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(Date.now() - start).toBeLessThan(3000);
});
```

## 관련 명령어

- `/we:init` - 프로젝트 초기화
- `/we:workflow` - CI/CD 워크플로우 생성
- `/we:deploy` - 프로젝트 배포
- `/we:health` - 시스템 상태 점검

## 문제 해결

### Playwright 설치 문제
```bash
# 브라우저 재설치
npx playwright install --with-deps
```

### 테스트 타임아웃
```typescript
// playwright.config.ts에서 타임아웃 증가
export default defineConfig({
  timeout: 60000, // 60초
});
```

### CI에서 실패
```bash
# 디버그 로그 활성화
DEBUG=pw:api /we:test ci
```

### 스크린샷 저장 위치
```
test-results/
├── homepage-should-load-chromium/
│   └── screenshot.png
└── html/
    └── index.html
```
