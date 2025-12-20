---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, Task, mcp__codeb-deploy__deploy, mcp__codeb-deploy__healthcheck, mcp__codeb-deploy__get_version_history]
description: "MCP codeb-deploy를 통한 프로젝트 배포"
---

# /we:deploy - 프로젝트 배포

## 🎯 목적
MCP codeb-deploy 연동을 통해 staging, production, preview 환경에 프로젝트를 배포합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:deploy [프로젝트] [--environment staging|production|preview] [--dry-run] [--force]
```

## 인자
- `프로젝트` - 배포할 프로젝트 이름 (선택, 기본값: 현재 디렉토리명)
- `--environment`, `-e` - 대상 환경: staging, production, preview (기본값: staging)
- `--dry-run` - 실제 실행 없이 배포 계획만 표시
- `--force` - 경고 무시하고 강제 배포
- `--no-cache` - 캐시 없이 빌드

## 배포 플로우
1. **환경 검증**: 프로젝트 설정 및 환경 확인
2. **사전 점검**: 대상 환경 헬스체크
3. **빌드**: GitHub Actions 또는 로컬 빌드로 컨테이너 이미지 생성
4. **푸시**: ghcr.io 레지스트리에 이미지 푸시
5. **배포**: MCP codeb-deploy로 컨테이너 배포
6. **헬스체크**: 배포 성공 여부 검증
7. **라우팅**: 필요시 Caddy 리버스 프록시 업데이트

## 빌드 에러 추적
```
🔴 빌드 에러 발생 시:
1. 에러 내용 분석
2. 근본 원인 파악
3. 동일 에러 반복 횟수 확인
4. 5회 반복 시 → 🚨 긴급 보고 생성
```

## MCP 연동
- `mcp__codeb-deploy__deploy` - 배포 실행
- `mcp__codeb-deploy__healthcheck` - 배포 상태 확인
- `mcp__codeb-deploy__get_version_history` - 이전 버전 확인

## 서버 정보
- **호스트**: 141.164.60.51
- **컨테이너 런타임**: Podman 4.6.2 + Quadlet
- **오케스트레이션**: systemd 서비스

## 예제
```
/we:deploy myapp --environment staging
/we:deploy myapp -e production --force
/we:deploy --dry-run
```

## 관련 명령어
- `/we:workflow` - CI/CD 워크플로우 생성
- `/we:rollback` - 이전 버전으로 롤백
- `/we:health` - 배포 상태 확인
