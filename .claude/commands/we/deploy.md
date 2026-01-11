---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, Task, mcp__codeb-deploy__deploy_project, mcp__codeb-deploy__slot_promote, mcp__codeb-deploy__slot_status, mcp__codeb-deploy__health_check]
description: "MCP codeb-deploy를 통한 Blue-Green 배포"
---

# /we:deploy - 프로젝트 배포 (v7.0)

## 🎯 목적
MCP codeb-deploy 연동을 통해 Blue-Green 배포를 수행합니다. Zero-downtime 배포를 지원합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:deploy [프로젝트] [--environment staging|production]
```

## 인자
- `프로젝트` - 배포할 프로젝트 이름 (선택, 기본값: 현재 디렉토리명)
- `--environment`, `-e` - 대상 환경: staging, production (기본값: staging)

## Blue-Green 배포 플로우
1. **비활성 슬롯 확인**: blue/green 중 비활성 슬롯 선택
2. **배포**: 비활성 슬롯에 새 버전 배포
3. **헬스체크**: 배포된 컨테이너 상태 확인
4. **Preview URL 제공**: 테스트용 URL 반환
5. **Promote**: 트래픽 전환 (별도 명령)

## MCP 도구
- `mcp__codeb-deploy__deploy_project` - 비활성 슬롯에 배포
- `mcp__codeb-deploy__slot_promote` - 트래픽 전환
- `mcp__codeb-deploy__slot_status` - 슬롯 상태 확인
- `mcp__codeb-deploy__health_check` - 전체 헬스체크

## 예제
```
mcp__codeb-deploy__deploy_project
{
  "projectName": "myapp",
  "environment": "staging"
}
```

## 관련 명령어
- `/we:workflow` - CI/CD 워크플로우 생성
- `/we:rollback` - 이전 버전으로 롤백
- `/we:health` - 배포 상태 확인
