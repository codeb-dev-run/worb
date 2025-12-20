---
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Task, mcp__sequential-thinking__sequentialthinking, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__magic__api]
description: "Task 도구를 통한 7-Agent 직접 호출"
---

# /we:agent - 에이전트 직접 호출

## 🎯 목적
Claude Code Task 도구를 사용하여 특정 7-Agent를 직접 호출하여 전문 작업을 수행합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:agent [타입] [작업] [옵션]
```

## 에이전트 타입
- **master** - 마스터 오케스트레이터: 전체 프로젝트 조율
- **api** - API 계약 수호자: API 설계 및 검증
- **frontend** - 프론트엔드 전문가: UI/UX 개발
- **db** - 데이터베이스 스키마 설계자: 데이터베이스 설계
- **e2e** - E2E 테스트 전략가: 테스트 자동화
- **admin** - 관리자 패널 빌더: 관리 인터페이스
- **all** - 모든 에이전트 실행

## 옵션
- `--context`, `-c` - 추가 컨텍스트 (JSON 형식)
- `--output`, `-o` - 출력 형식: text, json (기본값: text)
- `--save` - 에이전트 출력을 파일로 저장
- `--async` - 비동기로 에이전트 실행

## Task 도구 연동
각 에이전트는 Task 도구 subagent_type에 매핑됩니다:
- master → `master-orchestrator`
- api → `api-contract-guardian`
- frontend → `frontend-specialist`
- db → `db-schema-architect`
- e2e → `e2e-test-strategist`
- admin → `admin-panel-builder`

## MCP 연동
- `mcp__sequential-thinking__sequentialthinking` - 복잡한 추론
- `mcp__context7__get-library-docs` - 프레임워크 문서
- `mcp__magic__api` - UI 컴포넌트 생성

## 예제
```
/we:agent frontend "반응형 네비게이션 바 컴포넌트 만들기"
/we:agent api "사용자 인증 API 설계" -c '{"auth":"jwt"}'
/we:agent db "사용자 테이블 스키마 최적화"
/we:agent e2e "결제 플로우 테스트 스위트 생성"
/we:agent all "전체 프로젝트 분석"
```

## 관련 명령어
- `/we:analyze` - 프로젝트 분석
- `/we:optimize` - 최적화
