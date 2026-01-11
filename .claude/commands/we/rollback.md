---
allowed-tools: [Read, Bash, TodoWrite, mcp__codeb-deploy__rollback, mcp__codeb-deploy__slot_status, mcp__codeb-deploy__slot_list]
description: "MCP codeb-deploy를 통한 즉시 롤백"
---

# /we:rollback - 배포 롤백 (v7.0)

## 🎯 목적
MCP codeb-deploy를 사용하여 Blue-Green 배포에서 즉시 이전 버전으로 롤백합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 롤백 전 현재 상태 확인
- 롤백 후 헬스체크 필수

## 사용법
```
/we:rollback [프로젝트] [옵션]
```

## 옵션
- `--environment`, `-e` - 대상 환경 (기본값: production)

## Blue-Green 롤백 프로세스
1. 현재 슬롯 상태 확인
2. Grace 상태의 이전 슬롯 활성화
3. 트래픽 즉시 전환
4. 헬스체크 실행

## 롤백 조건
- Grace 상태의 슬롯이 있어야 함 (promote 후 48시간 이내)
- Grace 슬롯이 없으면 롤백 불가

## MCP 도구
- `mcp__codeb-deploy__rollback` - 롤백 실행
- `mcp__codeb-deploy__slot_status` - 슬롯 상태 확인
- `mcp__codeb-deploy__slot_list` - 전체 슬롯 목록

## 예제
```
mcp__codeb-deploy__rollback
{
  "projectName": "myapp",
  "environment": "production"
}
```

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:health` - 배포 상태 확인
