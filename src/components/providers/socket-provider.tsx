/**
 * Socket Provider - Centrifugo 기반 실시간 통신
 *
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새로운 코드는 centrifugo-provider.tsx를 직접 사용하세요.
 *
 * @deprecated 대신 CentrifugoProvider와 useCentrifugo를 사용하세요.
 */

export {
  CentrifugoProvider as SocketProvider,
  useCentrifugo,
  useSocket
} from './centrifugo-provider'
