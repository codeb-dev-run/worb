# /we:secrets - GitHub Secrets 자동 설정

GitHub Actions 배포에 필요한 Secrets (HOST, USERNAME, SSH_KEY)를 자동 설정합니다.

## 사용법

```bash
# 현재 저장소의 Secrets 확인
we secrets check

# Secrets 목록 조회
we secrets list

# 배포 Secrets 자동 설정
we secrets setup

# 특정 저장소 설정
we secrets setup owner/repo
```

## 필수 Secrets
- HOST: 배포 서버 IP (기본값: 141.164.60.51)
- USERNAME: SSH 사용자 (기본값: root)
- SSH_KEY: SSH 개인키

## 선택 Secrets
- ENV_PRODUCTION: .env.production 파일 내용
- GHCR_TOKEN: GitHub Container Registry 토큰

## 요구사항
- gh CLI 설치 및 인증 필요
- `gh auth login` 으로 GitHub 인증

$ARGUMENTS
