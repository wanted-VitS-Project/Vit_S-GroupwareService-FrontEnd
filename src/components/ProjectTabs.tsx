'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

/**
 * 프로젝트 전체 화면의 탭. `href` 는 프로젝트 경로 뒤에 붙는다.
 *
 * 첫 탭이 빈 문자열이라 `/projects/{id}` 자체가 이슈 화면이다 —
 * 프로젝트로 들어오면 가장 먼저 볼 것이 "무슨 일이 남았나" 라는 판단이다.
 *
 * ⚠️ 라벨을 `전체 이슈` 로 둔다 — 스텝 화면의 같은 것이 `이슈` 탭이다.
 *    범위만 프로젝트로 넓어졌을 뿐 같은 데이터라 이름을 갈라 부르지 않는다.
 */
const TABS = [
  { segment: '', label: '전체 이슈', icon: 'schedule' },
  { segment: '/files', label: '문서함', icon: 'document' },
  { segment: '/images', label: '이미지', icon: 'image' },
  { segment: '/trash', label: '휴지통', icon: 'trash' },
] as const;

type TabIcon = (typeof TABS)[number]['icon'];

/**
 * 프로젝트 전체 화면 상단 탭 내비게이션.
 * `/projects/{id}` 와 그 하위 `files` · `images` · `trash` 를 오간다.
 *
 * ⚠️ `StepTabs` 와 **같은 높이 · 같은 밑줄 규칙**을 쓴다 — 스텝 화면에서 프로젝트 화면으로
 *    넘어올 때 탭바가 흔들리면 두 화면이 다른 앱처럼 보인다. 한쪽을 고치면 다른 쪽도 함께 본다.
 */
export default function ProjectTabs() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();

  const base = `/projects/${params.id}`;

  return (
    <nav
      aria-label="프로젝트 화면"
      // 사이드바 '홈으로 돌아가기' 줄과 같은 높이(h-13)로 맞춘다.
      // 위 10px 을 비워 탭 자체는 42px 이 된다 (시안)
      className="h-13 shrink-0 border-b border-border-default bg-bg-card px-4 pt-2.5"
    >
      <ul className="flex h-full items-stretch">
        {TABS.map((tab) => {
          const href = `${base}${tab.segment}`;
          // 하위 경로가 더 늘어나도 '전체 이슈' 탭이 같이 활성되지 않게 정확히 비교한다
          const isActive = pathname === href;

          return (
            <li key={tab.segment} className="flex">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-3 text-body-l font-medium ${
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

/** 탭 아이콘. 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 (`StepTabs` 와 같은 방침) */
const PATHS: Record<TabIcon, React.ReactNode> = {
  /*
   * 전체 이슈 — 타임라인 격자(#). 스텝 화면의 `이슈` 탭과 같은 아이콘이다:
   * 범위만 프로젝트로 넓어졌을 뿐 같은 것을 본다.
   */
  schedule: (
    <>
      <path d="M3.5 9h17M3.5 15h17" />
      <path d="M9 3.5v17M15 3.5v17" />
    </>
  ),
  // 문서함 — 모서리 접힌 문서
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  // 이미지 — 액자 안의 산과 해
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 4 4 2.5-2.5L20 17" />
    </>
  ),
  // 휴지통 — 뚜껑 달린 통
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v5M14 11v5" />
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
