/**
 * 알림 실시간 수신 (SSE).
 *
 * 서버가 **응답을 닫지 않는** 연결 하나를 열어두고 새 알림을 밀어준다.
 * 그래서 `lib/api.ts` 래퍼가 아니라 `EventSource` 로 직접 연다.
 *
 * ⭐ **밀려온 알림을 목록에 끼워 넣지 않는다.** 신호만 받고 기존 조회를 다시 태운다 —
 *    이유는 두 가지다.
 *    1. 배지 숫자는 `?isRead=false` 의 `totalElements` 라 **서버만 정확히 안다.**
 *       밀려온 건수를 +1 하면 다른 탭 · 다른 화면에서 읽은 것과 어긋난다.
 *    2. 폴링이 안전망으로 남아 있어 **같은 알림을 둘 다 가져온다.** 끼워 넣으면
 *       `notificationId` 로 일일이 걸러야 하는데, 다시 조회하면 그 문제가 아예 없다.
 *    알림은 자주 오는 값이 아니라 요청 한 번이 더 나가는 편이 싸다.
 */

import { ENDPOINTS } from '@/constants/endpoints';
import { apiUrl } from '@/lib/api';

interface StreamHandlers {
  /** 새 알림이 왔거나(`notification`) 연결이 열렸다(`connected`) — 목록 · 배지를 다시 받는다 */
  onChanged: () => void;
}

/**
 * 스트림을 구독한다. 반환한 함수를 부르면 연결을 닫는다
 * (이펙트 정리 함수로 그대로 돌려주면 된다).
 *
 * ⚠️ **`withCredentials` 가 없으면 세션 쿠키가 안 실려 401 이다** — 연결 자체가 안 열린다.
 * ℹ️ 서버가 15초마다 보내는 `:ping` 은 SSE 주석이라 이벤트로 올라오지 않는다 (처리 불필요).
 */
export function subscribeNotificationStream({ onChanged }: StreamHandlers) {
  if (typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {};
  }

  const source = new EventSource(apiUrl(ENDPOINTS.notifications.stream), {
    withCredentials: true,
  });

  /**
   * 구독 직후 1회. 연결이 **끊겼던 사이에 발행된 알림은 스트림으로 오지 않으므로**
   * 열릴 때마다 한 번 맞춰 준다 (서버가 30분마다 끊고 브라우저가 다시 붙는다).
   */
  source.addEventListener('connected', () => onChanged());
  source.addEventListener('notification', () => onChanged());

  source.onerror = () => {
    /**
     * ⚠️ 여기서 오류를 알리지 않는다.
     *
     * 서버가 **30분마다 연결을 정상 종료**하고 브라우저가 자동으로 다시 붙는데,
     * 그 재연결도 `onerror` 를 거친다 — 장애가 아니라 정상 동작이다.
     * 30분마다 오류 문구가 뜨면 사용자는 앱이 고장 난 줄 안다.
     *
     * 다시 붙는 중(`CONNECTING`)이면 그냥 두고, 브라우저가 **포기한 경우**(`CLOSED`)에만
     * 정리한다. 인증이 풀린 경우가 여기인데, `EventSource` 는 401 에도 재연결을
     * 무한히 시도하므로 우리가 끊어야 한다. 로그인 화면으로 보내는 일은 하지 않는다 —
     * 남아 있는 주기 조회가 401 을 받아 `lib/api.ts` 의 전역 처리가 대신한다.
     */
    if (source.readyState === EventSource.CLOSED) source.close();
  };

  return () => source.close();
}
