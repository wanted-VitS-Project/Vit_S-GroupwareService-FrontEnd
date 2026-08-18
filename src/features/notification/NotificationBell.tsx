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
/** 배지는 유무만 표시하므로 목록은 최소로 받는다 */
const COUNT_ONLY_SIZE = 1;
/**
 * 배지를 다시 세는 주기. 즉시성은 SSE 가 맡고 이 주기는 정합성 안전망이다.
 * 숫자 한 개만 받는 가벼운 요청이며 탭이 숨어 있으면 세지 않는다.
 */
const POLL_MS = 120_000;

/**
 * 헤더 알림 종 (.ai/API.md 79~82).
 * 배지는 totalElements 를 쓰고 목록은 열 때마다 다시 받는다.
 */
export default function NotificationBell({
  /** 어두운 헤더 위에 놓일 때. 색만 달라진다 */
  isDark = false,
}: {
  isDark?: boolean;
}) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  /** Esc 로 닫았을 때 포커스를 돌려놓을 곳 */
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const countChannel = useRef<BroadcastChannel | null>(null);
  /** 마지막으로 숫자를 확인한 시각. 방금 확인했으면 주기 조회를 건너뛴다 */
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
        // 다음 새로고침의 첫 페인트를 위해 유무만 남긴다
        writeShellCookie({ hasUnread: page.totalElements > 0 });
        lastCheckedAt.current = Date.now();
        // 옆 탭은 이 값을 쓰고 자기 요청을 건너뛴다
        shareUnreadCount(countChannel.current, page.totalElements);
      })
      .catch(() => {
        /* 실패 · 취소 시 직전 숫자를 그대로 둔다. 0 으로 내리면 알림을 놓친다 */
      });

    return () => controller.abort();
  }, [reloadKey]);

  /* 배지를 다시 세는 신호 세 가지: 창 이벤트 · 탭 복귀 · 주기 조회 */
  useEffect(() => {
    const reload = () => setReloadKey((key) => key + 1);

    const reloadIfVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };

    const stopListening = onNotificationChanged(reload);

    /* 다른 탭이 받아온 숫자를 그대로 쓴다. 목록은 건드리지 않는다 */
    const shared = subscribeUnreadCount(({ unreadCount: count, sentAt }) => {
      setUnreadCount(count);
      // 다음 새로고침의 첫 페인트를 위해 유무만 남긴다
      writeShellCookie({ hasUnread: count > 0 });
      lastCheckedAt.current = sentAt;
    });
    countChannel.current = shared.channel;

    // 주기 안에 누군가 확인했으면 건너뛴다
    const timer = setInterval(() => {
      if (Date.now() - lastCheckedAt.current < POLL_MS) return;
      reloadIfVisible();
    }, POLL_MS);

    document.addEventListener('visibilitychange', reloadIfVisible);
    /* visibilitychange 로는 창 전환을 못 잡는 브라우저가 있어 포커스도 함께 본다 */
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

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setIsOpen(false);
      /* Esc 로 닫을 때만 포커스를 되돌린다. 바깥 클릭은 이미 다른 곳을 짚은 것이다 */
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
   * 알림을 연다. 이동 대상 조회가 읽음 처리를 겸해 읽음 API 를 따로 부르지 않는다.
   * 갈 곳이 없으면 읽음만 되고 드롭다운은 닫힌다.
   */
  async function open(notification: NotificationItem) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      const target = await getNotificationTarget(notification.notificationId);
      const route = routeOf(target);

      setIsOpen(false);
      // 열려 있는 알림 페이지도 함께 갱신한다
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

        {/* 숫자 대신 점만 찍는다. 배지 폭이 변하지 않아 아이콘이 밀리지 않는다 */}
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
          {/* 읽음 취소 API 가 없어 '모두 읽음' 은 두지 않는다 */}
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
