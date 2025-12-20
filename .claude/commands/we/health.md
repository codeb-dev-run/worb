---
allowed-tools: [Read, Bash, TodoWrite, mcp__codeb-deploy__healthcheck, mcp__codeb-deploy__analyze_server, mcp__codeb-deploy__monitoring]
description: "MCP codeb-deploy를 통한 시스템 상태 점검"
---

# /we:health - 시스템 상태 점검

## 🎯 목적
MCP codeb-deploy를 통해 컨테이너, 서비스, 리소스, 네트워크 연결 상태를 점검합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 문제 발견 시 원인과 해결방안 함께 제시
- 심각한 문제는 🚨 표시로 강조

## 사용법
```
/we:health [옵션]
```

## 옵션
- `--verbose`, `-v` - 상세 정보 표시
- `--json`, `-j` - JSON 형식으로 출력
- `--watch`, `-w` - 지속적 모니터링
- `--interval`, `-i` - 모니터링 간격 (초, 기본값: 30)

## 점검 항목
- 컨테이너 상태 (Podman/Quadlet)
- 서비스 상태 (systemd)
- 리소스 사용량 (CPU, 메모리, 디스크)
- 네트워크 연결
- 데이터베이스 연결 (PostgreSQL, Redis)
- SSL 인증서 유효성

## 상태 표시
```
✅ 정상: 문제 없음
⚠️ 경고: 주의 필요
🔴 오류: 즉시 조치 필요
🚨 심각: 긴급 대응 필요
```

## MCP 연동
- `mcp__codeb-deploy__healthcheck` - 헬스체크 실행
- `mcp__codeb-deploy__analyze_server` - 서버 전체 분석
- `mcp__codeb-deploy__monitoring` - 메트릭 및 알림 조회

## 예제
```
/we:health
/we:health --verbose
/we:health --watch --interval 10
/we:health --json
```

## 관련 명령어
- `/we:monitor` - 실시간 모니터링
- `/we:deploy` - 프로젝트 배포
