'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import Breadcrumb from '@/components/Breadcrumb';

import AdminFileExplorer, {
  type ExplorerPath,
  NO_STAGE,
} from './AdminFileExplorer';
import AdminFileList from './AdminFileList';

/**
 * 전사 프로젝트 파일 화면. 전사 관리 허브(`/settings`)의 `파일 › 프로젝트 파일` 로 들어온다.
 *
 * ⭐ `프로젝트 → 스테이지 → 스텝` 을 따라 들어가 그 자리의 파일을 본다.
 *    프로젝트를 고른 순간 파일이 아래에 펼쳐지고, 스테이지 · 스텝은 **좁히는 수단**이다.
 *
 * ⭐ **지금 위치는 URL 에 담는다** (`?projectId=&stageId=&stepId=`).
 *    화면 안 상태로만 두면 새로고침에 처음으로 돌아가고, 브라우저 뒤로가기가 한 단계 위가
 *    아니라 **직전 화면(사이드바로 옮겨온 곳)** 으로 나가 버린다. 주소에 담아 두면 둘 다
 *    자연스럽게 동작하고, 특정 스텝의 파일 자리를 링크로 건넬 수도 있다.
 *
 * ℹ️ 사내 문서함(`/settings/company-documents`)과 **한 화면에 탭으로 묶여 있었으나 갈랐다** —
 *    저장소 · API · 권한이 모두 다른 별개 도메인이다. (142번 `GET /admin/files`)
 */
export default function AdminFileScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** URL 이 위치의 원본이다 — 같은 쿼리면 같은 객체를 유지해 효과가 헛돌지 않게 한다 */
  const path = useMemo<ExplorerPath>(() => {
    const stage = searchParams.get('stageId');

    return {
      projectId: toId(searchParams.get('projectId')),
      stageId: stage === NO_STAGE ? NO_STAGE : toId(stage),
      stepId: toId(searchParams.get('stepId')),
    };
  }, [searchParams]);

  /**
   * 자리를 옮긴다.
   * ⚠️ `push` 다 (`replace` 가 아니다) — 한 단계씩 기록이 쌓여야 뒤로가기가 **위 단계로** 간다.
   */
  function move(next: ExplorerPath) {
    const params = new URLSearchParams();

    if (next.projectId !== undefined) {
      params.set('projectId', String(next.projectId));
    }
    if (next.stageId !== undefined) params.set('stageId', String(next.stageId));
    if (next.stepId !== undefined) params.set('stepId', String(next.stepId));

    const query = params.toString();
    router.push(query ? `/settings/files?${query}` : '/settings/files');
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '프로젝트 파일' },
        ]}
      />

      <div className="mt-2 mb-6">
        <h2 className="text-heading-m font-bold">프로젝트 파일</h2>
        <p className="mt-1.5 text-label break-keep text-text-secondary">
          전사 모든 프로젝트의 파일을 프로젝트 · 스테이지 · 스텝 순서로 찾아
          봅니다.
        </p>
      </div>

      <AdminFileExplorer path={path} onChange={move} />

      {/**
       * ⭐ **프로젝트만 골라도 파일이 바로 보인다.**
       *
       * 스텝까지 들어가야 파일이 나오게 두면 네 번을 눌러야 한 장을 본다.
       * 프로젝트를 고른 순간 그 프로젝트 파일 전부를 아래에 펴고, 스테이지 · 스텝은
       * 좁히는 수단으로 둔다 — 필요한 사람만 더 들어간다.
       */}
      {path.projectId !== undefined && (
        <div className="mt-3">
          <AdminFileList
            lockedProjectId={path.projectId}
            lockedStepId={path.stepId}
          />
        </div>
      )}
    </>
  );
}

/** URL 값은 사용자가 손댈 수 있다 — 숫자가 아니면 없는 것으로 본다 */
function toId(value: string | null) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
