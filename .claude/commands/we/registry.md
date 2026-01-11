---
allowed-tools: [Read, Write, Bash, TodoWrite]
description: "서버 레지스트리 관리 - 프로젝트/포트/도메인 중앙 관리 및 Preview 환경"
---

# /we:registry - 서버 레지스트리 관리

## 목적
서버의 프로젝트, 포트, 도메인 정보를 중앙에서 관리하고 Preview 환경을 통한 테스트 및 프로모션을 지원합니다.

## 중요 규칙
- **모든 응답은 한글로 작성**
- 코드 수정 시 임시 해결책 금지 → 근본 원인 파악 후 수정
- 동일한 빌드 에러가 5회 반복되면 반드시 보고

## 사용법
```
/we:registry [액션] [대상] [옵션]
```

## 액션
- **list** - 등록된 프로젝트 목록 조회
- **show** - 특정 프로젝트 상세 정보
- **add** - 새 프로젝트 등록
- **update** - 프로젝트 정보 수정
- **remove** - 프로젝트 삭제
- **ports** - 포트 할당 현황 조회
- **sync** - 서버와 레지스트리 동기화
- **preview** - Preview 환경 생성/관리
- **promote** - Preview를 staging/production으로 승격

## 옵션
- `--environment`, `-e` - 환경 선택 (production|staging|preview)
- `--port`, `-p` - 포트 번호
- `--domain`, `-d` - 도메인
- `--pr <number>` - PR 번호 (preview용)
- `--branch <branch>` - 브랜치 이름
- `--build <number>` - 빌드 번호
- `--ttl <hours>` - Preview TTL (기본값: 72시간)
- `--json` - JSON 형식 출력
- `--force` - 확인 없이 강제 실행

## 레지스트리 구조
```json
{
  "version": "1.0.0",
  "server": {
    "host": "141.164.60.51",
    "domains": ["codeb.dev", "one-q.xyz"]
  },
  "ports": {
    "reserved": { "22": "SSH", "80": "Caddy", ... },
    "range": {
      "production": "3000-3099",
      "staging": "3100-3199",
      "preview": "3200-3299"
    }
  },
  "projects": {},
  "previews": {}
}
```

## 포트 범위
- **production**: 3000-3099
- **staging**: 3100-3199
- **preview**: 3200-3299

## Preview 환경 워크플로우
```
1. PR 생성 → GitHub Actions 트리거
2. we registry preview myapp --pr 123 --build 456
3. 자동 도메인: pr-123.myapp.codeb.dev
4. 테스트 완료 후 승격
5. we registry promote myapp --pr 123 --environment production
6. TTL 만료 시 자동 정리
```

## 예제
```bash
# 프로젝트 목록
we registry list

# 프로젝트 상세 정보
we registry show myapp

# 새 프로젝트 등록
we registry add myapp --port 3000 --domain myapp.codeb.dev

# 프로젝트 업데이트
we registry update myapp --port 3001

# Preview 환경 생성
we registry preview myapp --pr 123 --build 456 --branch feature/new-ui

# Preview를 production으로 승격
we registry promote myapp --pr 123 --environment production

# 포트 현황 조회
we registry ports

# 서버와 동기화
we registry sync
```

## GitHub Actions 연동
```yaml
# PR Preview 배포
- name: Create Preview Environment
  run: |
    we registry preview ${{ github.event.repository.name }} \
      --pr ${{ github.event.pull_request.number }} \
      --build ${{ github.run_number }} \
      --branch ${{ github.head_ref }}

# 머지 후 Production 승격
- name: Promote to Production
  if: github.event.pull_request.merged == true
  run: |
    we registry promote ${{ github.event.repository.name }} \
      --pr ${{ github.event.pull_request.number }} \
      --environment production
```

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:workflow` - CI/CD 워크플로우 생성
- `/we:domain` - 도메인 관리
- `/we:health` - 시스템 상태 확인
