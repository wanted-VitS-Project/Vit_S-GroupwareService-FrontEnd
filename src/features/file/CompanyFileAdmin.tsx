'use client';

import { useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';

import CompanyDocumentList from '@/features/companyDocument/CompanyDocumentList';

import AdminFileList from './AdminFileList';

/** 탭 하나 = 관리 대상 한 종류. 탭이 늘면 이 배열에만 손댄다 */
const TABS = [
  { key: 'project', label: '프로젝트 파일' },
  { key: 'company', label: '사내 문서함' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** 탭 ↔ 패널을 잇는 id. 두 곳이 같은 규칙을 써야 연결이 끊기지 않는다 */
const tabId = (key: TabKey) => `company-file-tab-${key}`;
const panelId = (key: TabKey) => `company-file-panel-${key}`;

/**
 * 화살표 · Home · End 로 탭을 옮긴다 (WAI-ARIA tabs 패턴).
 * 옮긴 탭으로 **포커스까지 따라가야** 키보드만 쓰는 사람이 현재 위치를 잃지 않는다.
 */
function moveByKey(
  event: React.KeyboardEvent,
  index: number,
  select: (key: TabKey) => void,
) {
  const last = TABS.length - 1;
  const next =
    event.key === 'ArrowRight'
      ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft'
        ? (index - 1 + TABS.length) % TABS.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : null;

  if (next === null) return;

  event.preventDefault();
  const target = TABS[next];
  select(target.key);
  document.getElementById(tabId(target.key))?.focus();
}

/**
 * 전사 파일 관리. 전사 관리 허브(`/settings`)의 `파일 › 전사 파일 관리` 로 들어온다.
 *
 * 두 탭은 **관리 대상이 다를 뿐 하는 일이 같아** 한 화면 안에 둔다 —
 * 허브에 카드를 둘로 쪼개면 오가며 매번 허브를 거쳐야 한다.
 *
 * ℹ️ `프로젝트 파일` 은 142번(`GET /admin/files`), `사내 문서함` 은 143~150번
 *    (`/admin/company-documents`) 이다 — **저장소가 다른 별도 도메인**이라 코드도 갈라 둔다.
 */
export default function CompanyFileAdmin() {
  /**
   * 탭 상태는 화면 안에만 둔다 — 조회 조건이 아니라 **무엇을 관리하는지**의 구분이라
   * URL 에 남길 만한 것이 아직 없다. (본문에 검색·필터가 붙으면 그때 쿼리로 올린다)
   */
  const [tab, setTab] = useState<TabKey>('project');

  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '전사 파일 관리' },
        ]}
      />

      <div className="mt-2 mb-6">
        <h2 className="text-heading-m font-bold">전사 파일 관리</h2>
        <p className="mt-1.5 text-label break-keep text-text-secondary">
          전사 모든 프로젝트의 파일과 사내 문서함을 한곳에서 관리합니다.
        </p>
      </div>

      {/* 결재 관리 화면과 같은 규칙의 탭이다 (색은 `ProjectTabs` 와 같은 토큰을 쓴다) */}
      <div
        role="tablist"
        aria-label="전사 파일 관리 범위"
        className="mb-4 flex gap-1 border-b border-border-default"
      >
        {TABS.map((item, index) => {
          const isActive = item.key === tab;

          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={tabId(item.key)}
              aria-selected={isActive}
              aria-controls={panelId(item.key)}
              /**
               * 탭 묶음은 **한 번만 탭키로 들어온다** (WAI-ARIA tabs 패턴) —
               * 안에서는 화살표로 옮기고, 다음 Tab 은 본문으로 나간다.
               */
              tabIndex={isActive ? 0 : -1}
              onClick={() => setTab(item.key)}
              onKeyDown={(event) => moveByKey(event, index, setTab)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-label ${
                isActive
                  ? 'border-border-primary font-semibold text-text-primary-blue'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 패널은 **선택된 하나만** 그린다 — 나머지는 조회까지 돌 이유가 없다 */}
      <div
        role="tabpanel"
        id={panelId(tab)}
        aria-labelledby={tabId(tab)}
        tabIndex={0}
      >
        {tab === 'project' ? <AdminFileList /> : <CompanyDocumentList />}
      </div>
    </>
  );
}
