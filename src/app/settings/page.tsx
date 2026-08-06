import Link from 'next/link';

import PageTitle from '@/components/PageTitle';

type SettingIcon =
  'employee' | 'department' | 'badge' | 'category' | 'group' | 'lock';

interface SettingItem {
  icon: SettingIcon;
  label: string;
  description: string;
  /** 없으면 화면이 아직 없는 항목 — '준비 중' 으로 비활성 표시한다 */
  href?: string;
}

/** 설정 허브 구성. 관리 화면을 추가하면 여기에만 항목을 넣는다 */
const SECTIONS: { title: string; items: SettingItem[] }[] = [
  {
    title: '조직 · 인사',
    items: [
      {
        icon: 'employee',
        label: '사원 관리',
        description: '사원 정보 조회, 등록, 수정 및 계정 관리',
        href: '/settings/employees',
      },
      {
        icon: 'department',
        label: '부서 관리',
        description: '조직 구조 및 부서 정보 관리',
        href: '/settings/departments',
      },
      {
        icon: 'badge',
        label: '직급 관리',
        description: '직급 등록 및 노출 순서 관리',
        href: '/settings/job-positions',
      },
    ],
  },
  {
    title: '사업 기준정보',
    items: [
      {
        icon: 'category',
        label: '카테고리 관리',
        description: '프로젝트에 지정할 사업 카테고리 관리',
        href: '/settings/categories',
      },
    ],
  },
  {
    title: '권한 · 그룹',
    items: [
      {
        icon: 'group',
        label: '그룹 관리',
        description: '사용자 그룹 생성 및 구성원 관리',
      },
      {
        icon: 'lock',
        label: '페이지 권한',
        description: '시스템 페이지별 접근 권한 설정',
      },
    ],
  },
];

export default function Page() {
  return (
    <>
      <p className="text-xs text-slate-500">설정</p>
      <PageTitle title="설정" />

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="mb-2 px-1 text-xs font-medium text-[#6C7389]">
              {section.title}
            </h3>

            <div className="divide-y divide-[#1C1F2A]/5 overflow-hidden rounded-xl border border-[#1C1F2A]/10 bg-white">
              {section.items.map((item) => (
                <SettingRow key={item.label} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function SettingRow({ item }: { item: SettingItem }) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ECEEF4]/60 text-[#6C7389]">
        <SettingIconMark icon={item.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#1C1F2A]">
          {item.label}
        </span>
        <span className="mt-0.5 block text-xs break-keep text-[#6C7389]">
          {item.description}
        </span>
      </span>
    </>
  );

  // 아직 화면이 없는 항목은 링크로 만들지 않는다 — 404 로 보내는 것보다 정직하다
  if (!item.href) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 opacity-60">
        {content}
        <span className="shrink-0 rounded bg-[#ECEEF4] px-2 py-0.5 text-[10px] text-[#6C7389]">
          준비 중
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#ECEEF4]/40"
    >
      {content}
      <ChevronIcon />
    </Link>
  );
}

/** 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 */
const ICON_PATHS: Record<SettingIcon, React.ReactNode> = {
  employee: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  department: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </>
  ),
  badge: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="m8.5 13.5-1 7 4.5-2.5 4.5 2.5-1-7" />
    </>
  ),
  category: (
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
  group: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 6.5a3 3 0 0 1 0 5.8M18 19a5 5 0 0 0-2-4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
};

function SettingIconMark({ icon }: { icon: SettingIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 shrink-0 text-[#C7CCD9]"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
