'use client';

import { useEffect, useState } from 'react';

import { NOTIFICATION_CATEGORIES } from './display';
import { onNotificationChanged } from './events';
import NotificationSection from './NotificationSection';

/**
 * 알림 페이지 (.ai/API.md 79~81 · 83).
 * 미확인 · 확인 구역을 위아래로 두고 페이지는 각자 따로 넘긴다.
 */
export default function NotificationList() {
  /** 유형 필터. undefined 면 전체이며 쿼리에서 빠진다 */
  const [category, setCategory] = useState<string | undefined>(undefined);

  /** 한쪽 변경이 반대편 건수까지 바꾸므로 이 값을 올려 두 구역을 함께 다시 받는다 */
  const [refreshKey, setRefreshKey] = useState(0);

  /* 이 화면 밖에서 벌어진 변경까지 신호로 받아 다시 조회한다 */
  useEffect(
    () => onNotificationChanged(() => setRefreshKey((key) => key + 1)),
    [],
  );

  return (
    /* 좌우로 나누면 제목 · 본문이 잘려 위아래로 쌓는다 */
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1.5">
        {NOTIFICATION_CATEGORIES.map((chip) => (
          <button
            key={chip.label}
            type="button"
            aria-current={chip.value === category}
            onClick={() => setCategory(chip.value)}
            className={`cursor-pointer rounded-pill border px-3 py-1 text-caption font-semibold ${
              chip.value === category
                ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
                : 'border-border-default text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* key 에 유형을 넣어 필터가 바뀌면 구역을 새로 만든다 (페이지 초기화) */}
      <NotificationSection
        key={`unread-${category ?? 'all'}`}
        title="미확인"
        isRead={false}
        category={category}
        emptyText="읽지 않은 알림이 없습니다."
        refreshKey={refreshKey}
      />

      <NotificationSection
        key={`read-${category ?? 'all'}`}
        title="확인"
        isRead
        category={category}
        emptyText="읽은 알림이 없습니다."
        refreshKey={refreshKey}
      />
    </div>
  );
}
