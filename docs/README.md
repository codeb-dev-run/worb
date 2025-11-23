# CodeB Platform - 문서 디렉토리

이 디렉토리는 CodeB Platform의 모든 기술 문서를 포함합니다.

## 📚 문서 목록

### 핵심 문서
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처 및 기술 스택
- **[API_DATA_MODEL.md](./API_DATA_MODEL.md)** - API 엔드포인트 및 데이터 모델
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - 개발자를 위한 종합 가이드

### 참고 문서
- **[COMPONENTS.md](./COMPONENTS.md)** - UI 컴포넌트 가이드
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - 배포 프로세스 및 설정
- **[testing-guide.md](./testing-guide.md)** - 테스트 작성 가이드

## 🔗 외부 문서

루트 디렉토리의 문서:
- **[README.md](../README.md)** - 프로젝트 개요
- **[SETUP.md](../SETUP.md)** - 초기 설치 가이드

## 📖 문서 읽기 순서 (신규 개발자)

1. **[README.md](../README.md)** - 프로젝트 이해
2. **[SETUP.md](../SETUP.md)** - 개발 환경 설정
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 구조 이해
4. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - 개발 시작
5. **[API_DATA_MODEL.md](./API_DATA_MODEL.md)** - API 활용

## 🔄 문서 업데이트

문서 업데이트 시 다음 사항을 지켜주세요:

1. **일관성 유지**: 기존 문서 형식 따르기
2. **버전 기록**: 문서 하단에 버전 정보 업데이트
3. **최신성 유지**: 코드 변경 시 관련 문서도 함께 업데이트
4. **명확한 예제**: 코드 예제는 실제 동작하는 코드로 작성

## 📝 문서 작성 가이드

### Markdown 스타일
- 제목: \`#\` ~ \`####\` 사용
- 코드 블록: 언어 지정 (\`\`\`typescript)
- 링크: 상대 경로 사용
- 이미지: \`docs/images/\` 폴더에 저장

### 코드 예제
\`\`\`typescript
// ✅ Good: 명확한 주석과 타입
interface User {
  id: string;
  name: string;
}

// ❌ Bad: 주석 없고 any 사용
const getData = (id: any) => { /* ... */ }
\`\`\`

---

**최종 업데이트**: 2025-01-24
