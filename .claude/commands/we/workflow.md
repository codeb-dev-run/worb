---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, Task, mcp__codeb-deploy__generate_github_actions_workflow, mcp__codeb-deploy__init_project]
description: "Quadlet 및 GitHub Actions CI/CD 워크플로우 생성"
---

# /we:workflow - CI/CD 워크플로우 생성

## 🎯 목적
CodeB 인프라에 자동 배포를 위한 Quadlet 컨테이너 파일과 GitHub Actions CI/CD 워크플로우를 생성합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:workflow [액션] [프로젝트] [옵션]
```

## 액션
- `init` - 전체 워크플로우 초기화 (Quadlet + GitHub Actions + Dockerfile)
- `quadlet` - Quadlet .container 파일만 생성
- `github-actions` - GitHub Actions 워크플로우만 생성
- `dockerfile` - 최적화된 Dockerfile만 생성
- `update` - 기존 워크플로우 설정 업데이트

## 옵션
- `--type` - 프로젝트 타입: nextjs, remix, nodejs, static (기본값: nextjs)
- `--database` - PostgreSQL 데이터베이스 포함
- `--redis` - Redis 캐시 포함
- `--staging-port` - Staging 환경 포트 (기본값: 3001)
- `--production-port` - Production 환경 포트 (기본값: 3000)
- `--staging-domain` - Staging 도메인 (예: myapp-staging.one-q.xyz)
- `--production-domain` - Production 도메인 (예: myapp.one-q.xyz)
- `--host` - 배포 서버 호스트 (기본값: config에서 로드)
- `--no-tests` - CI/CD에서 테스트 건너뛰기
- `--no-lint` - CI/CD에서 린팅 건너뛰기

## 생성되는 파일
```
workflow init 실행 시:
├── quadlet/
│   ├── <프로젝트>.container          # Production Quadlet
│   ├── <프로젝트>-staging.container  # Staging Quadlet
│   └── <프로젝트>-postgres.container # DB Quadlet (--database 옵션 시)
├── .github/workflows/
│   └── deploy.yml                    # GitHub Actions 워크플로우
└── Dockerfile                        # 최적화된 멀티스테이지 Dockerfile
```

## MCP 연동
- `mcp__codeb-deploy__generate_github_actions_workflow` - CI/CD 워크플로우 생성
- `mcp__codeb-deploy__init_project` - 프로젝트 설정 초기화

## 예제
```
/we:workflow init myapp --type nextjs --database
/we:workflow quadlet myapp --port 3000 --image ghcr.io/org/myapp:latest
/we:workflow github-actions myapp --staging-port 3001 --production-port 3000
```

## 생성 후 작업
```bash
# Quadlet 파일을 서버로 복사 (SERVER_HOST는 설정에서 확인)
scp quadlet/*.container root@<SERVER_HOST>:/etc/containers/systemd/

# 서비스 리로드 및 시작
ssh root@<SERVER_HOST> "systemctl daemon-reload && systemctl start myapp.service"
```

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:ssh` - 배포용 SSH 키 관리
