---
allowed-tools: [Read, Write, Glob, Grep, Bash, TodoWrite, Task, mcp__sequential-thinking__sequentialthinking]
description: "7-Agent 시스템으로 프로젝트 분석"
---

# /we:analyze - 프로젝트 분석

## 🎯 목적
7-Agent 시스템을 활용하여 코드 리뷰, 보안 분석, 성능 프로파일링, 품질 평가를 종합적으로 수행합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:analyze [대상] [옵션]
```

## 인자
- `대상` - 분석할 대상 (프로젝트, 파일, 컴포넌트)

## 옵션
- `--depth`, `-d` - 분석 깊이: shallow(간단), normal(보통), deep(심층) (기본값: normal)
- `--focus`, `-f` - 집중 영역: security(보안), performance(성능), quality(품질), all(전체) (기본값: all)
- `--agent`, `-a` - 특정 에이전트: master, api, frontend, db, e2e, admin (기본값: master)
- `--output`, `-o` - 출력 형식: text, json, markdown (기본값: text)
- `--save` - 분석 리포트 파일로 저장

## 7-Agent 시스템
- **master** - 마스터 오케스트레이터: 전체 에이전트 조율
- **api** - API 계약 수호자: API 설계 검증
- **frontend** - 프론트엔드 전문가: UI/UX 분석
- **db** - 데이터베이스 스키마 설계자: 스키마 최적화
- **e2e** - E2E 테스트 전략가: 테스트 커버리지 분석
- **admin** - 관리자 패널 빌더: 관리 인터페이스 분석

## 실행 절차
1. 프로젝트 구조 및 기술 스택 파악
2. 코드 품질 지표 확인
3. 보안 취약점 스캔
4. 성능 병목 지점 분석
5. 분석 요약 리포트 생성 (한글)

## 예제
```
/we:analyze --depth deep --focus security
/we:analyze src/components/Auth --focus quality
/we:analyze --output markdown --save ./reports/analysis.md
```

## 관련 명령어
- `/we:optimize` - 분석 기반 최적화
- `/we:agent` - 에이전트 직접 호출
