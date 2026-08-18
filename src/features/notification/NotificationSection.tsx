'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Pagination from '@/components/Pagination';
import LoadingSpinner from '@/components/Spinner';
import { groupByDate } from '@/features/activityLog/time';
import { messageOf } from '@/lib/api';

import {
  deleteNotification,
  getNotifications,
  getNotificationTarget,
  readNotification,
} from './api';
import { isSystemNotification, routeOf, SYSTEM_CATEGORY } from './display';
import { notifyNotificationChanged } from './events';
import NotificationMenu from './NotificationMenu';
import NotificationRow from './NotificationRow';
import {
  isUnread,
  type NotificationItem,
  type NotificationPage,
} from './types';

/** 한 구역에 보여줄 개수. 두 구역이 스크롤 없이 화면에 들어오도록 줄였다 */
const PAGE_SIZE = 5;

/**
 * 시스템 칩일 때 한 번에 받아오는 개수(서버 상한).
 * 서버 category 로 거를 수 없어 통째로 받아 화면에서 고르고 나눈다.
 */
const SYSTEM_FETCH_SIZE = 100;

/**
 * 알림 목록 한 구역(미확인 또는 확인). 페이지는 구역마다 따로 넘긴다.
 * 읽음 · 삭제는 반대편 구역과 헤더 배지에도 영향을 줘 창 이벤트로 알린다.
 */
export default function NotificationSection({
  title,
  isRead,
  category,
  emptyText,
  refreshKey,
}: {
  title: string;
  /** 이 구역이 받을 목록. 두 구역은 이 값 하나만 다르다 */
  isRead: boolean;
  /** 유형 필터. 전체면 undefined 라 파라미터가 빠진다 */
  category?: string;
  emptyText: string;
  refreshKey: number;
}) {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  /** 시스템은 서버 필터가 없어 전체를 받아 화면에서 나눈다 */
  const isSystem = category === SYSTEM_CATEGORY;
  const query = isSystem
    ? { category: undefined, page: 0, size: SYSTEM_FETCH_SIZE }
    : { category, page, size: PAGE_SIZE };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getNotifications(
      { isRead, category: query.category, page: query.page, size: query.size },
      signal,
    )
      .then((received) => {
        setData(received);
        setHasFailed(false);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
    // 시스템은 페이지를 화면에서 나누므로 page 가 바뀌어도 다시 받지 않는다
  }, [isRead, query.category, query.page, query.size, refreshKey]);

  const view = toView(data, isSystem, page);

  /** 알림을 연다. 이동 대상 조회가 읽음 처리를 겸한다 */
  async function open(notification: NotificationItem) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      const target = await getNotificationTarget(notification.notificationId);
      const route = routeOf(target);

      // 이동 여부와 무관하게 읽음은 처리됐으므로 헤더 배지에 바로 알린다
      notifyNotificationChanged();
      if (route) router.push(route);
    } catch (caught) {
      setError(messageOf(caught, '알림을 열지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function read(notificationId: number) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await readNotification(notificationId);
      notifyNotificationChanged();
    } catch (caught) {
      setError(messageOf(caught, '읽음 처리하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function remove(notificationId: number) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await deleteNotification(notificationId);

      // 마지막 한 건을 지우면 페이지가 비므로 한 장 앞으로 물러선다
      if (view.rows.length === 1 && page > 0) {
        setPage((current) => current - 1);
      }
      notifyNotificationChanged();
    } catch (caught) {
      setError(messageOf(caught, '삭제하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-label font-bold text-text-primary">
        {title}
        {/* 목록 길이가 아니라 전체 건수를 보여준다 */}
        <span className="ml-1.5 text-caption font-normal text-text-secondary">
          {view.totalElements}
        </span>
      </h2>

      {error !== '' && (
        <p
          role="alert"
          className="mt-2 text-caption break-keep text-text-danger"
        >
          {error}
        </p>
      )}

      {/* 스크롤이 겹치지 않도록 높이를 고정하지 않는다 */}
      <div className="mt-2 overflow-hidden rounded-base border border-border-default">
        {hasFailed && (
          <p className="flex-1 px-4 py-10 text-center text-caption text-text-secondary">
            알림을 불러오지 못했습니다.
          </p>
        )}

        {!hasFailed && data === null && (
          <LoadingSpinner label="알림을 불러오는 중" className="px-4 py-10" />
        )}

        {data !== null && view.rows.length === 0 && (
          <p className="flex-1 px-4 py-10 text-center text-caption text-text-secondary">
            {emptyText}
          </p>
        )}

        {view.rows.length > 0 && (
          <>
            {/* 날짜별로 묶어 머리를 붙인다. 응답이 최신순이라 다시 정렬하지 않는다 */}
            {groupByDate(view.rows).map((group) => (
              <div key={group.dateKey}>
                <p className="border-b border-border-default bg-bg-surface px-4 py-1.5 text-caption font-semibold text-text-secondary">
                  {group.dateLabel}
                </p>

                <ul className="divide-y divide-border-default">
                  {group.logs.map((item) => (
                    <li key={item.notificationId}>
                      <NotificationRow
                        notification={item}
                        disabled={isBusy}
                        onOpen={() => open(item)}
                        // 날짜는 머리에 있으므로 줄에는 시각까지 적는다
                        showFullTime
                        trailing={
                          <NotificationMenu
                            // 이미 읽은 알림에는 '읽음' 을 그리지 않는다
                            canRead={isUnread(item)}
                            disabled={isBusy}
                            onRead={() => read(item.notificationId)}
                            onDelete={() => remove(item.notificationId)}
                          />
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Pagination
              page={page}
              totalPages={view.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * 화면에 그릴 목록 · 건수 · 쪽수.
 * 시스템 칩은 서버가 걸러 주지 못해 받아 온 목록에서 고르고 쪽도 직접 나눈다.
 */
function toView(
  received: NotificationPage | null,
  isSystem: boolean,
  page: number,
) {
  if (received === null) return { rows: [], totalElements: 0, totalPages: 0 };

  if (!isSystem) {
    return {
      rows: received.content,
      totalElements: received.totalElements,
      totalPages: received.totalPages,
    };
  }

  const picked = received.content.filter((item) =>
    isSystemNotification(item.notificationType),
  );

  return {
    rows: picked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    totalElements: picked.length,
    totalPages: Math.ceil(picked.length / PAGE_SIZE),
  };
}
