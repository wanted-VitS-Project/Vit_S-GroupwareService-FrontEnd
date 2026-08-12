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

/* ─────────────────── 탭 간 공유 ─────────────────── */

/**
 * 안 읽은 개수를 **탭끼리 나눠 쓴다.**
 *
 * 탭을 세 개 열면 세 탭이 각자 물어봐 요청만 세 배가 된다. 한 탭이 받아온 숫자를
 * 나머지에 뿌리면, 주기를 더 짧게 가져가도 서버가 받는 요청은 오히려 줄어든다.
 *
 * ⚠️ 실시간 채널이 아니다 — 새 알림을 **먼저 알려주는 것은 여전히 주기 조회**다.
 *    이 통로는 이미 받아온 값을 옆 탭에 옮길 뿐이다.
 * ℹ️ `BroadcastChannel` 을 지원하지 않는 환경에서는 조용히 꺼진다 (탭마다 각자 조회).
 */
const COUNT_CHANNEL = 'notification:unread-count';

export interface UnreadCountMessage {
  unreadCount: number;
  /** 보낸 시각(ms). 받은 쪽이 "방금 갱신됐다" 를 판단하는 데 쓴다 */
  sentAt: number;
}

/** 안 읽은 개수 메시지인지 — 숫자 두 개가 제대로 들어왔는지만 본다 */
function isUnreadCountMessage(data: unknown): data is UnreadCountMessage {
  if (typeof data !== 'object' || data === null) return false;

  const { unreadCount, sentAt } = data as Partial<UnreadCountMessage>;

  return (
    typeof unreadCount === 'number' &&
    Number.isFinite(unreadCount) &&
    unreadCount >= 0 &&
    typeof sentAt === 'number' &&
    Number.isFinite(sentAt)
  );
}

function openChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  return new BroadcastChannel(COUNT_CHANNEL);
}

/** 방금 받아온 숫자를 다른 탭에 알린다 */
export function shareUnreadCount(
  channel: BroadcastChannel | null,
  unreadCount: number,
) {
  channel?.postMessage({
    unreadCount,
    sentAt: Date.now(),
  } satisfies UnreadCountMessage);
}

/**
 * 다른 탭이 받아온 숫자를 구독한다.
 * 정리 함수가 채널까지 닫으므로 이펙트에서 그대로 돌려주면 된다.
 */
export function subscribeUnreadCount(
  listener: (message: UnreadCountMessage) => void,
) {
  const channel = openChannel();

  if (channel) {
    /**
     * ⚠️ `MessageEvent<T>` 는 **타입 주장일 뿐 런타임 검증이 아니다.**
     * 같은 origin 의 다른 코드가 엉뚱한 값을 보내면 배지 숫자가 깨진다 —
     * 모양을 확인한 메시지만 넘긴다.
     */
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isUnreadCountMessage(event.data)) listener(event.data);
    };
  }

  return {
    channel,
    close: () => channel?.close(),
  };
}
