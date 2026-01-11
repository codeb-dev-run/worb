---
allowed-tools: [Read, Write, Bash, TodoWrite, mcp__codeb-deploy__domain_setup, mcp__codeb-deploy__domain_delete, mcp__codeb-deploy__domain_list, mcp__codeb-deploy__domain_verify, mcp__codeb-deploy__ssl_status]
description: "MCP codeb-deploy를 통한 도메인 관리 (설정/삭제/확인/목록)"
---

# /we:domain - 도메인 관리 (v7.0)

## 🎯 목적
MCP codeb-deploy를 통해 DNS 설정, SSL 인증서, Caddy 리버스 프록시 설정을 포함한 도메인을 관리합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- 도메인 삭제 시 반드시 확인 절차 진행
- SSL 인증서 상태 항상 확인

## 사용법
```
/we:domain [액션] [도메인] [옵션]
```

## 액션
- `setup` - DNS 및 SSL로 새 도메인 설정
- `delete` - 도메인 설정 삭제
- `verify` - 도메인 DNS 및 SSL 상태 확인
- `list` - 설정된 모든 도메인 목록

## MCP 도구
- `mcp__codeb-deploy__domain_setup` - 도메인 설정
- `mcp__codeb-deploy__domain_delete` - 도메인 삭제
- `mcp__codeb-deploy__domain_list` - 도메인 목록
- `mcp__codeb-deploy__domain_verify` - DNS/SSL 검증
- `mcp__codeb-deploy__ssl_status` - SSL 인증서 상태

## 예제
```
mcp__codeb-deploy__domain_setup
{
  "projectName": "myapp",
  "domain": "myapp.codeb.kr",
  "environment": "production"
}

mcp__codeb-deploy__domain_list
{
  "projectName": "myapp"
}
```

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:workflow` - 도메인 설정 포함 CI/CD 생성
