---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, WebFetch]
description: "Vultr API를 통한 팀 협업용 SSH 키 관리"
---

# /we:ssh - SSH 키 관리

## 🎯 목적
Vultr API를 통해 팀 협업용 SSH 키를 관리합니다. 팀원들의 SSH 키를 자동으로 등록하여 배포 접근 권한을 부여합니다.

## 📌 중요 규칙
- **모든 응답은 한글로 작성**
- API 키는 절대 저장소에 커밋하지 않음
- 키 삭제 시 반드시 확인 절차 진행

## 사용법
```
/we:ssh [액션] [대상] [옵션]
```

## 액션
- `register` - 로컬 SSH 공개키를 Vultr에 등록
- `list` - 등록된 SSH 키 목록 조회
- `remove` - SSH 키 삭제 (ID로 지정)
- `show` - SSH 키 상세 정보 조회
- `sync` - 로컬과 Vultr 키 동기화 상태 확인

## 옵션
- `--name`, `-n` - SSH 키 이름 (팀원 이름 권장)
- `--api-key` - Vultr API 키 (또는 VULTR_API_KEY 환경변수 사용)
- `--force` - 확인 없이 실행
- `--json` - JSON 형식으로 출력

## API 키 설정
```bash
# 방법 1: 환경변수
export VULTR_API_KEY=your_api_key

# 방법 2: 설정 파일 (~/.vultr.json)
{"api_key": "your_api_key"}

# 방법 3: 명령어 옵션
/we:ssh list --api-key your_api_key
```

## 팀 협업 워크플로우
```
1. 팀원이 SSH 키 생성 (없는 경우)
   $ ssh-keygen -t ed25519 -C "email@example.com"

2. 관리자가 Vultr API 키 공유

3. 팀원이 자신의 SSH 키 등록
   /we:ssh register --name "홍길동"

4. GitHub Actions 배포에서 해당 키 사용 가능
```

## 예제
```
/we:ssh register --name "김개발"
/we:ssh register ~/.ssh/id_ed25519.pub --name "박디자인"
/we:ssh list
/we:ssh list --json
/we:ssh remove abc123-def456
/we:ssh sync
```

## Vultr API
- **API 키 발급**: https://my.vultr.com/settings/#settingsapi
- **엔드포인트**: https://api.vultr.com/v2/ssh-keys

## 보안 주의사항
- Vultr에 등록된 SSH 키는 새 서버 생성 시 자동 추가됨
- 기존 서버는 ~/.ssh/authorized_keys에 수동 추가 필요
- API 키는 안전하게 보관하고 저장소에 커밋 금지

## 관련 명령어
- `/we:workflow` - CI/CD 워크플로우 생성 (배포 시 SSH 사용)
- `/we:deploy` - 프로젝트 배포 (SSH 접근 필요)
