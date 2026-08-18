/**
 * 알림 실시간 수신(SSE). 래퍼 대신 EventSource 로 직접 연다.
 * 밀려온 알림을 목록에 끼워 넣지 않고 신호만 받아 기존 조회를 다시 태운다.
 */

import { ENDPOINTS } from '@/constants/endpoints';
import { apiUrl } from '@/lib/api';

interface StreamHandlers {
  /** 새 알림이 오거나 연결이 열리면 목록 · 배지를 다시 받는다 */
  onChanged: () => void;
}

/**
 * 스트림을 구독한다. 반환한 함수를 부르면 연결을 닫는다.
 * 세션 쿠키를 실어야 하므로 withCredentials 가 필요하다.
 */
export function subscribeNotificationStream({ onChanged }: StreamHandlers) {
  if (typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {};
  }

  const source = new EventSource(apiUrl(ENDPOINTS.notifications.stream), {
    withCredentials: true,
  });

  /* 끊겼던 사이의 알림은 스트림으로 오지 않아 연결될 때마다 한 번 맞춘다 */
  source.addEventListener('connected', () => onChanged());
  source.addEventListener('notification', () => onChanged());

  source.onerror = () => {
    /*
      주기적인 재연결도 여기를 거치므로 오류로 알리지 않는다.
      브라우저가 포기한 경우(CLOSED)에만 무한 재연결을 막으려 직접 닫는다.
    */
    if (source.readyState === EventSource.CLOSED) source.close();
  };

  return () => source.close();
}
