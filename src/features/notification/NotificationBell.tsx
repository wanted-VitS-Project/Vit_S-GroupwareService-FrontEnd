'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { writeShellCookie } from '@/features/auth/shellCache';
import LoadingSpinner from '@/components/Spinner';
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
/** 배지는 있고 없고만 표시하므로 목록은 최소로 받는다 */
const COUNT_ONLY_SIZE = 1;
/**
 * 배지를 다시 세는 주기. 알림은 **밖에서 늘어나는 값**이라 가만히 두면 낡는다.
 *
 * ⭐ **즉시성은 이제 SSE 가 맡는다** (`NotificationStreamProvider`) — 새 알림이 오면
 *    스트림이 곧바로 신호를 보내 이 종이 다시 조회한다. 그래서 5초까지 줄여 두었던
 *    타이머를 **2분**으로 늘렸다. 화면을 열어 둔 사용자 한 명당 분당 12번씩 나가던
 *    요청이 사라진다.
 *
 * 그래도 **지우지는 않는다** — 역할이 갈린다.
 * - **SSE = 즉시성** — 새 알림을 바로 알린다
 * - **폴링 = 정합성** — 연결이 끊긴 사이에 발행됐거나 전송이 실패한 알림을 덮는다
 *
 * ⚠️ 조회는 `?isRead=false&size=1` 로 **숫자 한 개만** 받는 가벼운 요청이고,
 *    탭이 숨어 있으면 아예 세지 않는다 (`visibilityState` 확인).
 *    탭끼리 결과를 나눠 써(`subscribeUnreadCount`) 탭 수에 비례해 늘지도 않는다.
 */
const POLL_MS = 120_000;

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
        // 다음 새로고침의 첫 페인트가 같은 모습이도록 유무만 남긴다
        writeShellCookie({ hasUnread: page.totalElements > 0 });
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
   * - **다른 화면의 처리 · 새 알림** — 알림 페이지에서 읽거나 지우면, 그리고 **SSE 로 새 알림이
   *   오면**(`NotificationStreamProvider`) 같은 창 이벤트로 알려 온다
   * - **탭 복귀** — 돌아왔을 때 낡은 숫자가 떠 있으면 안 된다. 숨어 있는 동안은 세지 않는다
   * - **주기 조회** — 스트림이 끊겼던 사이를 메우는 안전망 (`POLL_MS` 주석 참고)
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
      // 다음 새로고침의 첫 페인트가 같은 모습이도록 유무만 남긴다
      writeShellCookie({ hasUnread: count > 0 });
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

        {/**
         * 안 읽은 알림이 있다는 **사실만** 알린다.
         *
         * 숫자를 쓰면 도착할 때마다 배지 폭이 달라져 종 아이콘이 밀리고, 처음 그릴 때도
         * 없다가 툭 나타난다. 점은 크기가 고정이라 붙어도 자리가 흔들리지 않는다.
         * 정확한 개수는 아래 목록에서 본다.
         */}
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-0 right-0 size-2.5 rounded-pill border-2 border-bg-header bg-red-text"
          />
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
            <LoadingSpinner
              label="알림을 불러오는 중"
              className="px-4 pb-4"
              spinnerClassName="size-5"
            />
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
