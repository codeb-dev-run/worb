---
allowed-tools: [Read, Bash, TodoWrite, mcp__codeb-deploy__rollback, mcp__codeb-deploy__get_version_history]
description: "MCP codeb-deploy를 통한 이전 버전으로 롤백"
---

# /we:rollback - 배포 롤백

## 🎯 목적
MCP codeb-deploy를 사용하여 안전하게 이전 버전으로 롤백합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 롤백 전 현재 상태 백업 확인
- 롤백 후 헬스체크 필수

## 사용법
```
/we:rollback [프로젝트] [옵션]
```

## 옵션
- `--environment`, `-e` - 대상 환경 (기본값: staging)
- `--version`, `-v` - 롤백할 특정 버전
- `--list` - 사용 가능한 버전 목록
- `--force` - 확인 없이 롤백
- `--dry-run` - 실제 실행 없이 롤백 계획만 표시

## 롤백 프로세스
1. 레지스트리에서 버전 히스토리 조회
2. 대상 버전 존재 여부 검증
3. 현재 배포 중지
4. 이전 버전 배포
5. 헬스체크 실행
6. 필요시 라우팅 업데이트

## 버전 표시
```
📋 버전 목록 예시:
v1.2.3 (현재) - 2024-01-15 배포
v1.2.2        - 2024-01-14 배포
v1.2.1        - 2024-01-13 배포
```

## MCP 연동
- `mcp__codeb-deploy__rollback` - 롤백 실행
- `mcp__codeb-deploy__get_version_history` - 버전 히스토리 조회

## 예제
```
/we:rollback myapp --list
/we:rollback myapp -e production -v v1.2.3
/we:rollback myapp --dry-run
/we:rollback myapp --force
```

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:health` - 배포 상태 확인
