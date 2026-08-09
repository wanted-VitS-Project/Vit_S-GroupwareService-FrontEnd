'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { messageOf } from '@/lib/api';

import {
  getNotifications,
  getNotificationTarget,
  readAllNotifications,
} from './api';
import { routeOf } from './display';
import { notifyNotificationChanged, onNotificationChanged } from './events';
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
 * 실시간 채널(SSE · 웹소켓)이 없어 주기 조회로 메운다 — 너무 잦으면 요청만 쌓인다.
 */
const POLL_MS = 60_000;

/**
 * 헤더 알림 종. (알림 도메인 · .ai/API.md 74~77)
 *
 * 배지 숫자는 `?isRead=false` 의 **`totalElements`** 다 — 목록 길이는 `size` 에 잘려 실제와 다르다.
 * 목록은 **열 때마다** 다시 받는다. 알림은 밖에서 늘어나는 값이라 캐시해두면 금방 낡는다.
 */
export default function NotificationBell() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  /** 목록을 다시 받아야 할 때 올린다 */
  const [reloadKey, setReloadKey] = useState(0);

  /** 배지 숫자. 열지 않아도 보여야 해서 목록과 따로 받는다 */
  useEffect(() => {
    const controller = new AbortController();

    getNotifications(
      { isRead: false, size: COUNT_ONLY_SIZE },
      controller.signal,
    )
      .then((page) => setUnreadCount(page.totalElements))
      // 배지는 곁다리다 — 못 받으면 숫자만 빠지고 종은 그대로 눌린다
      .catch(() => setUnreadCount(0));

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
    const timer = setInterval(reloadIfVisible, POLL_MS);
    document.addEventListener('visibilitychange', reloadIfVisible);

    return () => {
      stopListening();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', reloadIfVisible);
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
      if (event.key === 'Escape') setIsOpen(false);
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

  async function readAll() {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await readAllNotifications();
      // 응답 본문을 쓰지 않는다 — 신호를 보내 목록 · 배지 · 알림 페이지를 다시 받는다
      notifyNotificationChanged();
    } catch (caught) {
      setError(messageOf(caught, '모두 읽음 처리하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0 ? `알림 ${unreadCount}건 읽지 않음` : '알림'
        }
        className="relative flex cursor-pointer items-center rounded-lg p-1.5 text-slate-500 hover:bg-[#ECEEF4] hover:text-slate-900"
      >
        <BellIcon />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#E7000B] px-1 text-[9px] font-bold text-white">
            {unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-20 mt-2 w-95 overflow-hidden rounded-xl border border-[#1C1F2A]/10 bg-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-bold text-[#1C1F2A]">알림</span>
            <button
              type="button"
              onClick={readAll}
              disabled={isBusy || unreadCount === 0}
              className="cursor-pointer text-xs text-[#6C7389] hover:text-[#1C1F2A] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
            >
              모두 읽음
            </button>
          </div>

          {error !== '' && (
            <p
              role="alert"
              className="px-4 pb-3 text-xs break-keep text-[#E7000B]"
            >
              {error}
            </p>
          )}

          {items === null && (
            <p className="px-4 pb-4 text-xs text-[#6C7389]">불러오는 중…</p>
          )}

          {items?.length === 0 && error === '' && (
            <p className="px-4 pb-4 text-xs text-[#6C7389]">알림이 없습니다.</p>
          )}

          {items && items.length > 0 && (
            <ul className="border-t border-[#1C1F2A]/10">
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
            className="block border-t border-[#1C1F2A]/10 py-3 text-center text-xs font-semibold text-[#3B5BDB] hover:bg-[#ECEEF4]/40"
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
