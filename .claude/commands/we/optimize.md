---
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Task, mcp__sequential-thinking__sequentialthinking]
description: "프로젝트 성능 및 리소스 최적화"
---

# /we:optimize - 프로젝트 최적화

## 🎯 목적
번들 크기, 메모리 사용량, 데이터베이스 쿼리를 포함한 프로젝트 성능을 최적화합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고
- 최적화 전후 벤치마크 비교 제시

## 사용법
```
/we:optimize [옵션]
```

## 옵션
- `--target`, `-t` - 최적화 대상: bundle, memory, database, all (기본값: all)
- `--aggressive` - 공격적인 최적화 전략 사용
- `--safe-mode` - 검증을 포함한 보수적 최적화
- `--dry-run` - 실제 실행 없이 최적화 계획만 표시

## 최적화 대상
- **bundle** - JavaScript 번들 크기 축소
- **memory** - 메모리 사용량 최적화
- **database** - 데이터베이스 쿼리 최적화
- **all** - 모든 최적화

## 최적화 리포트
```
📊 최적화 결과:
번들 크기: 2.1MB → 1.2MB (42% 감소) ✅
메모리:    512MB → 380MB (26% 감소) ✅
쿼리 시간: 120ms → 45ms (63% 감소) ✅
```

## 예제
```
/we:optimize --target bundle
/we:optimize --aggressive
/we:optimize --safe-mode --dry-run
```

## 관련 명령어
- `/we:analyze` - 최적화 전 분석
- `/we:deploy` - 최적화된 코드 배포
