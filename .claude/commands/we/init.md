---
allowed-tools: [Read, Write, Edit, Bash, Glob, TodoWrite, Task, mcp__codeb-deploy__workflow_init, mcp__codeb-deploy__workflow_scan, mcp__codeb-deploy__health_check, mcp__codeb-deploy__slot_status, mcp__codeb-deploy__domain_setup, mcp__codeb-deploy__domain_list]
description: "신규 프로젝트 초기화 - 서버 인프라 설정 + .env 파일 생성 + MCP 레지스트리 등록"
---

# /we:init - 프로젝트 초기화 (v7.0)

## 사용법

```
/we:init [api-key]
```

**예시:**
```
/we:init                           # .env에 CODEB_API_KEY가 있으면 자동 사용
/we:init codeb_팀ID_역할_토큰       # API 키 직접 지정
```

## 실행 순서 (필수) - 반드시 순서대로 실행!

### 1단계: API 키 자동 감지 (가장 먼저!)

**⚠️ 중요: Read 도구로 .env 파일을 먼저 읽어야 합니다!**

```
Read 도구로 .env 파일 확인:
file_path: .env
```

**확인 후 분기:**
- `CODEB_API_KEY=codeb_xxx` 가 있으면 → **즉시 2단계로 진행!** (추가 질문 없음)
- 키가 없으면 → 사용자에게 API 키 입력 요청

**키가 없을 때만 저장 (AskUserQuestion 사용 금지, Bash로 직접 저장):**
```bash
mkdir -p ~/.codeb
cat > ~/.codeb/config.json << 'EOF'
{
  "CODEB_API_KEY": "<사용자가 제공한 키>",
  "CODEB_API_URL": "https://api.codeb.kr"
}
EOF
```

### 2단계: 프로젝트 정보 확인

```
Read 도구로 package.json 확인:
file_path: package.json
→ name 필드에서 프로젝트명 추출
```

### 3단계: MCP 도구로 서버 인프라 초기화

API 키가 확인되면 바로 MCP 도구를 호출합니다:

```
mcp__codeb-deploy__workflow_init
{
  "projectName": "<프로젝트명>",
  "type": "nextjs",
  "database": true,
  "redis": true
}
```

## ⚠️ 중요: 절대 하지 말아야 할 것
- **AskUserQuestion으로 API 키 물어보지 않기** (options 2개 이상 필요)
- **npx @codeblabdev-max/we-cli init 호출하지 않기** (inquirer 에러 발생)
- **.env에 키가 있는데 다시 물어보지 않기**

## API 키 우선순위
1. **프로젝트 .env 파일** (최우선) - `CODEB_API_KEY=...`
2. 환경변수 `CODEB_API_KEY`
3. `~/.codeb/config.json`
4. `~/.codeb/.env` (레거시)

**이미 .env에 키가 있으면 추가 설정 없이 바로 MCP 도구 사용 가능!**

## 목적
새 프로젝트를 위한 서버 인프라를 자동으로 설정합니다:
- **Blue-Green Slot 생성**: staging/production 환경별 blue/green 슬롯 설정
- **Quadlet 컨테이너 파일 생성**: Podman systemd 서비스 파일
- **환경변수 파일 생성**: .env.staging, .env.production
- **SSOT 레지스트리 등록**: /opt/codeb/registry/

## 아키텍처 (v7.0)
```
Blue-Green Deployment
├── staging
│   ├── blue (port: 3xxx)
│   └── green (port: 3xxx+1)
└── production
    ├── blue (port: 4xxx)
    └── green (port: 4xxx+1)

공유 인프라
├── codeb-postgres:5432 (db.codeb.kr)
└── codeb-redis:6379 (db.codeb.kr)
```

## 초기화 후 생성되는 파일
- `~/.codeb/config.json` (로컬 - API 키 저장)
- `/opt/codeb/registry/slots/{project}-staging.json` (서버)
- `/opt/codeb/registry/slots/{project}-production.json` (서버)
- `/opt/codeb/projects/{project}/quadlet/*.container` (서버)
- `/opt/codeb/projects/{project}/.env.staging` (서버)
- `/opt/codeb/projects/{project}/.env.production` (서버)

## 관련 명령어
- `/we:deploy` - 프로젝트 배포
- `/we:workflow` - CI/CD 워크플로우 생성
- `/we:health` - 시스템 상태 확인
