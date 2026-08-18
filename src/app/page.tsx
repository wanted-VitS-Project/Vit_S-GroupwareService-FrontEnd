// SSR - 대시보드(메인): 요약 → 내 프로젝트 → 알림·일정 순으로 쌓는 진입 화면. 비로그인 차단은 src/proxy.ts 가 담당한다.
import type { Metadata } from 'next';

import DashboardNotifications from '@/features/dashboard/DashboardNotifications';
import DashboardProjects from '@/features/dashboard/DashboardProjects';
import DashboardSchedule from '@/features/dashboard/DashboardSchedule';
import DashboardSummary from '@/features/dashboard/DashboardSummary';

// 없으면 전역 제목(VitaS)이 상속돼 탭·북마크에서 화면을 구분할 수 없다.
export const metadata: Metadata = {
  title: '대시보드',
};

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

      {/* 알림(1) : 캘린더+이슈(2) 비율 — 캘린더와 이슈는 한 상자를 둘로 나눠 쓰므로 같은 폭을 주면 캘린더 칸이 눌린다 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardNotifications />
        <DashboardSchedule />
      </div>
    </div>
  );
}
