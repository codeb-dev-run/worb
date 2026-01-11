---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, Task, mcp__codeb-deploy__workflow_init, mcp__codeb-deploy__workflow_scan, mcp__codeb-deploy__slot_status]
description: "프로젝트 인프라 초기화 및 CI/CD 워크플로우 생성"
---

# /we:workflow - CI/CD 워크플로우 (v7.0)

## 🎯 목적
CodeB 인프라에 Blue-Green 배포를 위한 프로젝트 초기화 및 CI/CD 워크플로우를 생성합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:workflow [액션] [프로젝트] [옵션]
```

## 액션
- `init` - 프로젝트 인프라 초기화 (슬롯, Quadlet, ENV)
- `scan` - 프로젝트 설정 스캔

## 옵션
- `--type` - 프로젝트 타입: nextjs, remix, nodejs, python, go (기본값: nextjs)
- `--database` - PostgreSQL 데이터베이스 포함 (기본값: true)
- `--redis` - Redis 캐시 포함 (기본값: true)

## 생성되는 리소스
```
workflow init 실행 시:
├── /opt/codeb/registry/slots/
│   ├── {project}-staging.json    # Staging 슬롯 레지스트리
│   └── {project}-production.json # Production 슬롯 레지스트리
├── /opt/codeb/projects/{project}/
│   ├── quadlet/*.container       # Podman Quadlet 파일
│   ├── .env.staging              # Staging 환경변수
│   └── .env.production           # Production 환경변수
└── /opt/codeb/registry/ssot.json # SSOT 업데이트
```

## MCP 도구
- `mcp__codeb-deploy__workflow_init` - 프로젝트 초기화
- `mcp__codeb-deploy__workflow_scan` - 프로젝트 스캔
- `mcp__codeb-deploy__slot_status` - 슬롯 상태 확인

## 예제
```
mcp__codeb-deploy__workflow_init
{
  "projectName": "myapp",
  "type": "nextjs",
  "database": true,
  "redis": true
}

mcp__codeb-deploy__workflow_scan
{
  "projectName": "myapp"
}
```

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:init` - 로컬 프로젝트 설정 초기화
