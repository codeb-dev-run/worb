---
allowed-tools: [Read, Bash, TodoWrite, mcp__codeb-deploy__health_check, mcp__codeb-deploy__slot_list, mcp__codeb-deploy__analytics_realtime]
description: "MCP codeb-deploy를 통한 실시간 시스템 모니터링"
---

# /we:monitor - 실시간 모니터링 (v7.0)

## 🎯 목적
MCP codeb-deploy를 통해 실시간 시스템 모니터링을 수행합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 임계치 초과 시 즉시 알림
- 이상 징후 발견 시 원인 분석

## 사용법
```
/we:monitor [옵션]
```

## 모니터링 항목
- Blue-Green 슬롯 상태
- 배포 이력
- 실시간 트래픽 (Analytics)
- Web Vitals (LCP, FID, CLS)

## 상태 표시
```
📊 실시간 모니터링:
Blue Slot:  ✅ active (v1.2.3)
Green Slot: ⚠️ deployed (v1.2.4) - 테스트 대기중
```

## MCP 도구
- `mcp__codeb-deploy__health_check` - 전체 헬스체크
- `mcp__codeb-deploy__slot_list` - 전체 슬롯 목록
- `mcp__codeb-deploy__analytics_realtime` - 실시간 메트릭

## 예제
```
mcp__codeb-deploy__slot_list
{}

mcp__codeb-deploy__analytics_realtime
{
  "projectName": "myapp"
}
```

## 관련 명령어
- `/we:health` - 상태 점검
- `/we:deploy` - 프로젝트 배포
