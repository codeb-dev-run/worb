# Centrifugo 서버 설정 가이드

## 상태: ✅ 해결됨 (2026-01-15)

Centrifugo 서버 namespace 설정 완료:
- 서버: ws.codeb.kr (141.164.42.213)
- 문제: namespace 미설정으로 `unknown channel` 오류 발생
- 해결: user, workspace, project, chat namespace 추가

## 필요한 서버 설정

`/etc/centrifugo/config.json`에 다음 내용 추가:

```json
{
  "token_hmac_secret_key": "of0KuRFjjzhq5LlBURCuKqzTUAA08hwL",
  "api_key": "pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G",
  "admin": true,
  "admin_password": "admin",
  "admin_secret": "admin_secret",
  "allowed_origins": ["*"],
  "namespaces": [
    {
      "name": "user",
      "publish": false,
      "subscribe_to_publish": false,
      "anonymous": false,
      "presence": true,
      "join_leave": true,
      "history_size": 10,
      "history_ttl": "300s"
    },
    {
      "name": "workspace",
      "publish": false,
      "subscribe_to_publish": false,
      "anonymous": false,
      "presence": true,
      "join_leave": true,
      "history_size": 20,
      "history_ttl": "600s"
    },
    {
      "name": "project",
      "publish": true,
      "subscribe_to_publish": true,
      "anonymous": false,
      "presence": true,
      "join_leave": true,
      "history_size": 50,
      "history_ttl": "3600s"
    },
    {
      "name": "chat",
      "publish": true,
      "subscribe_to_publish": true,
      "anonymous": false,
      "presence": true,
      "join_leave": true,
      "history_size": 100,
      "history_ttl": "86400s"
    }
  ]
}
```

## 서버 적용 명령어

```bash
# SSH 접속
ssh root@141.164.42.213

# 설정 파일 편집
nano /etc/centrifugo/config.json

# Centrifugo 재시작
docker restart centrifugo
# 또는
systemctl restart centrifugo
```

## Namespace 설명

| Namespace | 용도 | 설정 |
|-----------|------|------|
| `user:` | 개인 알림 | publish: false (서버만 발행) |
| `workspace:` | 워크스페이스 알림 | publish: false (서버만 발행) |
| `project:` | 프로젝트 실시간 | publish: true (클라이언트 발행 허용) |
| `chat:` | 채팅 | publish: true (클라이언트 발행 허용) |

## 클라이언트 채널 패턴

```javascript
// 개인 알림
`user:${userId}`

// 워크스페이스 알림
`workspace:${workspaceId}`

// 프로젝트 실시간
`project:${projectId}`

// 채팅
`chat:${chatId}`
```

## 테스트 방법

```bash
# 서버에서 publish 테스트
curl -X POST http://ws.codeb.kr:8000/api/publish \
  -H "Authorization: apikey pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G" \
  -H "Content-Type: application/json" \
  -d '{"channel": "user:testuser", "data": {"event": "notification", "title": "테스트"}}'

# 성공 응답: {"result":{}}
# 실패 응답: {"error":{"code":102,"message":"unknown channel"}}
```

## 현재 서버 상태 확인

```bash
curl -X POST http://ws.codeb.kr:8000/api/info \
  -H "Authorization: apikey pRMupNs6HlGp7G6xkPsAFrI8hN4g6U0G" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 참고 문서

- [Centrifugo Documentation](https://centrifugal.dev/docs/server/configuration)
- [Namespaces Configuration](https://centrifugal.dev/docs/server/channels#namespace-configuration)
