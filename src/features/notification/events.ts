/**
 * 알림이 바뀌었음을 화면끼리 알리는 신호.
 *
 * 헤더 종과 알림 페이지는 **부모-자식이 아니다.** 페이지에서 한 건을 읽으면 종의 배지도
 * 줄어야 하는데, 서로 props 가 닿지 않아 창 이벤트로 알린다 (블록의 `block:changed` 와 같은 방식).
 */
const NOTIFICATION_CHANGED = 'notification:changed';

/** 읽음 · 삭제 등 목록을 바꾼 쪽에서 부른다 */
export function notifyNotificationChanged() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED));
}

/** 신호를 받으면 다시 받는다. 정리 함수를 그대로 이펙트에서 돌려주면 된다 */
export function onNotificationChanged(listener: () => void) {
  window.addEventListener(NOTIFICATION_CHANGED, listener);
  return () => window.removeEventListener(NOTIFICATION_CHANGED, listener);
}
