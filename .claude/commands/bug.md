---
description: 버그 리포트 → GitHub Issue → 브랜치 → PR 자동 생성
---

버그 제목: $ARGUMENTS

다음 작업을 순서대로 수행하세요:

## 1. GitHub Issue 생성
- 제목: $ARGUMENTS
- Labels: bug
- Body에 포함할 내용:
  - 버그 설명
  - 재현 단계 (placeholder)
  - 예상 동작
  - 환경 정보

## 2. 브랜치 생성
- 생성된 이슈 번호를 사용
- 형식: `fix/issue-{번호}-{간단한-설명}`
- main 브랜치에서 분기

## 3. PR 생성
- 제목: `fix: $ARGUMENTS`
- Body에 `Closes #{이슈번호}` 포함하여 이슈 자동 연결
- ready 상태로 생성 (draft: false)

완료 후 생성된 Issue URL과 PR URL을 알려주세요.
