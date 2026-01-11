---
allowed-tools: [Read, Bash, TodoWrite, mcp__codeb-deploy__health_check, mcp__codeb-deploy__slot_status, mcp__codeb-deploy__slot_list]
description: "MCP codeb-deploy를 통한 시스템 상태 점검"
---

# /we:health - 시스템 상태 점검 (v7.0)

## 🎯 목적
MCP codeb-deploy를 통해 컨테이너, 서비스, Blue-Green 슬롯 상태를 점검합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 문제 발견 시 원인과 해결방안 함께 제시
- 심각한 문제는 🚨 표시로 강조

## 사용법
```
/we:health [옵션]
```

## 점검 항목
- Blue-Green 슬롯 상태
- 컨테이너 상태 (Podman/Quadlet)
- 서비스 상태 (systemd)
- 데이터베이스 연결 (PostgreSQL, Redis)
- SSL 인증서 유효성

## 상태 표시
```
✅ 정상: 문제 없음
⚠️ 경고: 주의 필요
🔴 오류: 즉시 조치 필요
🚨 심각: 긴급 대응 필요
```

## MCP 도구
- `mcp__codeb-deploy__health_check` - 전체 헬스체크
- `mcp__codeb-deploy__slot_status` - 특정 프로젝트 슬롯 상태
- `mcp__codeb-deploy__slot_list` - 전체 슬롯 목록

## 예제
```
mcp__codeb-deploy__health_check
{}

mcp__codeb-deploy__slot_status
{
  "projectName": "myapp",
  "environment": "production"
}
```

## 관련 명령어
- `/we:monitor` - 실시간 모니터링
- `/we:deploy` - 프로젝트 배포
