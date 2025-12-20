---
allowed-tools: [Read, Bash, TodoWrite, mcp__codeb-deploy__monitoring, mcp__codeb-deploy__analyze_server]
description: "MCP codeb-deploy를 통한 실시간 시스템 모니터링"
---

# /we:monitor - 실시간 모니터링

## 🎯 목적
MCP codeb-deploy를 통해 알림 및 임계치 설정과 함께 실시간 시스템 모니터링을 수행합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 임계치 초과 시 즉시 알림
- 이상 징후 발견 시 원인 분석

## 사용법
```
/we:monitor [옵션]
```

## 옵션
- `--metrics`, `-m` - 모니터링할 메트릭: cpu,memory,network,disk (기본값: cpu,memory)
- `--interval`, `-i` - 업데이트 간격 (초, 기본값: 5)
- `--duration`, `-d` - 모니터링 시간 (분, 0 = 무한, 기본값: 0)
- `--threshold`, `-t` - 알림 임계치 (%, 기본값: 80)

## 모니터링 메트릭
- **CPU**: 사용률, 로드 평균
- **메모리**: 사용/가용량, 스왑 사용량
- **디스크**: 마운트 포인트별 사용량
- **네트워크**: 대역폭, 연결 수

## 상태 표시
```
📊 실시간 모니터링:
CPU:    ████████░░ 80% ⚠️
메모리: ██████░░░░ 60% ✅
디스크: ███████░░░ 70% ✅
```

## MCP 연동
- `mcp__codeb-deploy__monitoring` - 메트릭 조회 및 알림 설정
- `mcp__codeb-deploy__analyze_server` - 서버 전체 분석

## 예제
```
/we:monitor --metrics cpu,memory
/we:monitor --metrics cpu,memory,disk,network --threshold 90
/we:monitor --duration 10 --interval 2
```

## 관련 명령어
- `/we:health` - 상태 점검
- `/we:deploy` - 프로젝트 배포
