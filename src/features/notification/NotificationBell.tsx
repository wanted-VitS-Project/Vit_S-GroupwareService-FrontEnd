'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { messageOf } from '@/lib/api';

import { getNotifications, getNotificationTarget } from './api';
import { routeOf } from './display';
import {
  notifyNotificationChanged,
  onNotificationChanged,
  shareUnreadCount,
  subscribeUnreadCount,
} from './events';
import NotificationRow from './NotificationRow';
import { NOTIFICATION_ROUTES } from './routes';
import { type NotificationItem } from './types';

/** 드롭다운에 보여줄 개수. 전체는 알림 페이지에서 본다 */
const PREVIEW_SIZE = 5;
/** 배지에는 숫자만 쓰므로 목록은 최소로 받는다 */
const COUNT_ONLY_SIZE = 1;
/** 두 자리를 넘으면 배지가 아이콘을 밀어낸다 */
const BADGE_MAX = 99;
/**
 * 배지를 다시 세는 주기. 알림은 **밖에서 늘어나는 값**이라 가만히 두면 낡는다.
 *
 * ⏳ **SSE 엔드포인트가 아직 없다.** 실시간 채널이 생기기 전까지 주기 조회로 메운다.
 *    60초는 "새로고침해야 숫자가 오른다" 로 느껴져 **5초**까지 줄였다.
 *    ⚠️ 짧게 가져갈 수 있는 이유는 **탭끼리 결과를 나눠 쓰기** 때문이다
 *       (`subscribeUnreadCount`) — 탭을 여러 개 열어도 요청은 한 탭만 낸다.
 *    ⚠️ 조회는 `?isRead=false&size=1` 로 **숫자 한 개만** 받는 가벼운 요청이고,
 *       탭이 숨어 있으면 아예 세지 않는다 (`visibilityState` 확인).
 *    SSE 가 열리면 이 타이머는 **연결 실패 시의 예비 수단**으로만 남긴다.
 */
const POLL_MS = 5_000;

/**
 * 헤더 알림 종. (알림 도메인 · .ai/API.md 79~82)
 *
 * 배지 숫자는 `?isRead=false` 의 **`totalElements`** 다 — 목록 길이는 `size` 에 잘려 실제와 다르다.
 * 목록은 **열 때마다** 다시 받는다. 알림은 밖에서 늘어나는 값이라 캐시해두면 금방 낡는다.
 */
export default function NotificationBell({
  /** 프로젝트 화면의 어두운 헤더 위에 놓일 때 (색만 달라진다) */
  isDark = false,
}: {
  isDark?: boolean;
}) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  /** Esc 로 닫았을 때 포커스를 돌려놓을 곳 — 안 그러면 키보드 사용자가 위치를 잃는다 */
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  /** 목록을 다시 받아야 할 때 올린다 */
  const [reloadKey, setReloadKey] = useState(0);

  /** 다른 탭이 받아온 숫자를 옮겨 담는 통로 */
  const countChannel = useRef<BroadcastChannel | null>(null);
  /** 마지막으로 숫자를 확인한 시각 — 방금 확인했으면 주기 조회를 건너뛴다 */
  const lastCheckedAt = useRef(0);

  /** 배지 숫자. 열지 않아도 보여야 해서 목록과 따로 받는다 */
  useEffect(() => {
    const controller = new AbortController();

    getNotifications(
      { isRead: false, size: COUNT_ONLY_SIZE },
      controller.signal,
    )
      .then((page) => {
        setUnreadCount(page.totalElements);
        lastCheckedAt.current = Date.now();
        // 옆 탭은 이 값을 쓰고 자기 요청을 건너뛴다
        shareUnreadCount(countChannel.current, page.totalElements);
      })
      .catch(() => {
        /**
         * **직전 숫자를 그대로 둔다.** 0 으로 내리면 안 읽은 알림이 없는 것처럼 보여
         * 사용자가 알림을 놓친다 — 못 받은 것과 없는 것은 다르다.
         *
         * 취소도 여기로 온다. 취소는 새 요청이 이미 떠 있다는 뜻이라,
         * 늦게 도착한 취소가 방금 받은 숫자를 덮어쓰면 안 된다.
         */
      });

    return () => controller.abort();
  }, [reloadKey]);

  /**
   * 배지를 다시 세게 만드는 신호 세 가지.
   *
   * - **다른 화면의 처리** — 알림 페이지에서 읽거나 지우면 창 이벤트로 알려 온다
   * - **탭 복귀** — 돌아왔을 때 낡은 숫자가 떠 있으면 안 된다. 숨어 있는 동안은 세지 않는다
   * - **주기 조회** — 실시간 채널이 없어 새 알림은 이 방법으로만 알 수 있다
   */
  useEffect(() => {
    const reload = () => setReloadKey((key) => key + 1);

    const reloadIfVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };

    const stopListening = onNotificationChanged(reload);

    /**
     * 다른 탭이 받아온 숫자를 그대로 쓴다 — 내 탭은 요청을 내지 않는다.
     * 값만 옮기는 것이라 목록(`items`)은 건드리지 않는다.
     */
    const shared = subscribeUnreadCount(({ unreadCount: count, sentAt }) => {
      setUnreadCount(count);
      lastCheckedAt.current = sentAt;
    });
    countChannel.current = shared.channel;

    // 방금(주기 안에) 누군가 확인했으면 건너뛴다 — 탭 수만큼 요청이 늘지 않게
    const timer = setInterval(() => {
      if (Date.now() - lastCheckedAt.current < POLL_MS) return;
      reloadIfVisible();
    }, POLL_MS);

    document.addEventListener('visibilitychange', reloadIfVisible);
    /**
     * 창 포커스에도 다시 센다 — 다른 앱을 보다 돌아오는 경우다.
     * `visibilitychange` 는 **탭 전환**만 잡고 창 전환은 못 잡는 브라우저가 있다.
     * 주기 조회를 기다리지 않고 돌아오는 즉시 맞는 숫자를 보여준다.
     */
    window.addEventListener('focus', reloadIfVisible);

    return () => {
      stopListening();
      shared.close();
      countChannel.current = null;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', reloadIfVisible);
      window.removeEventListener('focus', reloadIfVisible);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const { signal } = controller;

    getNotifications({ size: PREVIEW_SIZE }, signal)
      .then((page) => {
        setItems(page.content);
        setError('');
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;
        setItems([]);
        setError(messageOf(caught, '알림을 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [isOpen, reloadKey]);

  /** 바깥을 누르거나 Esc 를 누르면 닫는다 — 상자를 열어둔 채 다른 일을 하게 두지 않는다 */
  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setIsOpen(false);
      /**
       * Esc 로 닫을 때만 포커스를 종으로 되돌린다.
       * 바깥 클릭은 사용자가 이미 다른 곳을 짚은 것이라, 그때 뺏어오면 방해가 된다.
       */
      triggerRef.current?.focus();
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  /**
   * 알림을 연다. 이동 대상 조회가 **읽음 처리를 겸하므로** 읽음 API 를 따로 부르지 않는다.
   * 갈 곳이 없거나(`NONE`) 아직 화면이 없는 종류면 읽음만 되고 상자는 그대로 닫는다.
   */
  async function open(notification: NotificationItem) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      const target = await getNotificationTarget(notification.notificationId);
      const route = routeOf(target);

      setIsOpen(false);
      // 읽음이 됐다 — 열려 있는 알림 페이지도 함께 갱신된다
      notifyNotificationChanged();
      if (route) router.push(route);
    } catch (caught) {
      setError(messageOf(caught, '알림을 열지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0 ? `알림 ${unreadCount}건 읽지 않음` : '알림'
        }
        className={`relative flex cursor-pointer items-center rounded-sidebar p-1.5 ${
          isDark
            ? 'text-text-muted hover:bg-bg-sidebar-hover hover:text-text-white'
            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
        }`}
      >
        <BellIcon />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-pill bg-red-text px-1 text-micro font-bold text-text-white">
            {unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="알림"
          className="absolute top-full right-0 z-20 mt-2 w-95 overflow-hidden rounded-base border border-border-default bg-bg-card shadow-lg"
        >
          {/**
           * `모두 읽음` 은 두지 않는다 (2026-08-12) — 한 번 누르면 되돌릴 수 없는데
           * **읽음 취소 API 가 없다.** 안 본 알림까지 통째로 지워지는 셈이라 뺐다.
           */}
          <div className="px-4 py-3">
            <span className="text-label font-bold text-text-primary">알림</span>
          </div>

          {error !== '' && (
            <p
              role="alert"
              className="px-4 pb-3 text-caption break-keep text-text-danger"
            >
              {error}
            </p>
          )}

          {items === null && (
            <p className="px-4 pb-4 text-caption text-text-secondary">
              불러오는 중…
            </p>
          )}

          {items?.length === 0 && error === '' && (
            <p className="px-4 pb-4 text-caption text-text-secondary">
              알림이 없습니다.
            </p>
          )}

          {items && items.length > 0 && (
            <ul className="border-t border-border-default">
              {items.map((item) => (
                <li key={item.notificationId}>
                  <NotificationRow
                    notification={item}
                    disabled={isBusy}
                    onOpen={() => open(item)}
                  />
                </li>
              ))}
            </ul>
          )}

          <Link
            href={NOTIFICATION_ROUTES.list}
            onClick={() => setIsOpen(false)}
            className="block border-t border-border-default py-3 text-center text-caption font-semibold text-text-primary-blue hover:bg-bg-surface"
          >
            알림 전체 보기
          </Link>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
