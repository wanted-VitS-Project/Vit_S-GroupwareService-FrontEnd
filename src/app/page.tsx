import type { Metadata } from 'next';

import DashboardNotifications from '@/features/dashboard/DashboardNotifications';
import DashboardProjects from '@/features/dashboard/DashboardProjects';
import DashboardSchedule from '@/features/dashboard/DashboardSchedule';
import DashboardSummary from '@/features/dashboard/DashboardSummary';

/** 없으면 전역 제목(`VitaS`)이 그대로 상속돼 탭 · 북마크에서 화면을 구분할 수 없다 */
export const metadata: Metadata = {
  title: '대시보드',
};

/**
 * 대시보드(메인). 비로그인 접근 차단은 `src/proxy.ts` 가 담당한다.
 *
 * 네 구역이 **위에서 아래로** 쌓인다 — 요약 → 내 프로젝트 → 알림 · 일정.
 * 프로젝트 요약 · 카드는 `내 프로젝트` 화면과 **같은 API · 같은 컴포넌트**를 쓴다.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="dashboardSummary">
        <h2
          id="dashboardSummary"
          className="mb-3 text-logo leading-8 font-semibold text-text-primary"
        >
          프로젝트 요약
        </h2>
        <DashboardSummary />
      </section>

      <DashboardProjects />

      {/*
        `알림(1) : 캘린더 + 이슈(2)` 비율. 캘린더와 이슈는 **한 상자 안에서** 둘로 나뉘므로
        같은 칸 폭을 주면 각각 알림의 절반이 되어 캘린더 칸이 눌린다.

        두 상자는 **같은 높이**로 늘어난다 (`items-stretch` 기본) —
        내용이 넘치면 각자 안에서만 굴러 아래 끝이 어긋나지 않는다.
        좁은 화면에서는 위아래로 쌓인다.
      */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardNotifications />
        <DashboardSchedule />
      </div>
    </div>
  );
}
