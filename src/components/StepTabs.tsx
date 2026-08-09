'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

/** 스텝 상세 화면의 탭. `href` 는 스텝 경로 뒤에 붙는다 */
const TABS = [
  { segment: '', label: '블록', icon: 'block' },
  { segment: '/issue', label: '일정', icon: 'schedule' },
  { segment: '/log', label: '활동 기록', icon: 'history' },
] as const;

type TabIcon = (typeof TABS)[number]['icon'];

/**
 * 스텝 상세 화면 상단 탭 내비게이션.
 * `/projects/{id}/steps/{stepId}` 와 그 하위 `issue` · `log` 를 오간다.
 */
export default function StepTabs() {
  const params = useParams<{ id: string; stepId: string }>();
  const pathname = usePathname();

  const base = `/projects/${params.id}/steps/${params.stepId}`;

  return (
    <nav
      aria-label="스텝 화면"
      // 사이드바 '홈으로 돌아가기' 줄과 같은 높이(h-13)로 맞춘다
      className="h-13 shrink-0 border-b border-border-default bg-white px-4"
    >
      <ul className="flex h-full items-stretch">
        {TABS.map((tab) => {
          const href = `${base}${tab.segment}`;
          // 하위 경로가 더 늘어나도 '블록' 탭이 같이 활성되지 않게 정확히 비교한다
          const isActive = pathname === href;

          return (
            <li key={tab.segment} className="flex">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-3 text-base font-medium ${
                  isActive
                    ? 'border-border-primary text-text-primary-blue'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <TabIcon name={tab.icon} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 탭 아이콘. 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 */
const PATHS: Record<TabIcon, React.ReactNode> = {
  // 블록 — 쌓인 판 3개
  block: (
    <>
      <path d="M4 4h16v6H4z" />
      <path d="M4 13h16" />
      <path d="M4 18h16" />
    </>
  ),
  // 일정 — 타임라인 격자
  schedule: (
    <>
      <path d="M4 9h16M4 15h16" />
      <path d="M8 3v18M14 3v18" />
    </>
  ),
  // 활동 기록 — 시계
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
};

function TabIcon({ name }: { name: TabIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 shrink-0"
    >
      {PATHS[name]}
    </svg>
  );
}
