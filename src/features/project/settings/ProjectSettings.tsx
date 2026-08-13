'use client';

import { useEffect, useState } from 'react';

import {
  getProject,
  getProjectMembers,
  getProjectStages,
  getProjectSteps,
} from '../api';
import ProjectMemberSection from '../member/ProjectMemberSection';
import type {
  ProjectDetail,
  ProjectMember,
  ProjectStage,
  ProjectStep,
} from '../types';
import DeleteProjectSection from './DeleteProjectSection';
import ProjectCategorySection from './ProjectCategorySection';
import ProjectInfoForm from './ProjectInfoForm';
import ProjectStatusSection from './ProjectStatusSection';
import StepPermissionSection from './StepPermissionSection';

/**
 * 프로젝트 설정 화면. (.ai/API.md 125~133)
 *
 * 한 화면에 **기본 정보 · 상태 · 사업 카테고리 · 참여자** 네 가지가 들어간다 —
 * 전부 프로젝트 `EDITOR` 만 쓸 수 있고, 서로 다른 API 를 부르지만
 * "이 프로젝트를 어떻게 두느냐" 라는 한 가지 판단이라 화면을 나누지 않는다.
 *
 * ⚠️ **상세를 한 번만 읽고 각 섹션에 나눠준다.** 낙관적 락 때문에 `version` 이 한 벌이어야 하고,
 *    섹션마다 따로 읽으면 저장 직후 다른 섹션이 옛 `version` 을 들고 있어 무조건 409 가 된다.
 *    그래서 저장한 섹션이 `onSaved(version)` 으로 **새 값을 여기로 올려** 함께 갈아끼운다.
 */
export default function ProjectSettings({ projectId }: { projectId: string }) {
  const [reloadCount, setReloadCount] = useState(0);
  const [membersReloadCount, setMembersReloadCount] = useState(0);

  /*
   * 어떤 요청의 결과인지 `key` 로 들고 있는다.
   * 조건이 바뀌면 key 가 어긋나 저절로 로딩 상태가 되므로,
   * 효과 본문에서 상태를 되돌릴 필요가 없다 (`react-hooks/set-state-in-effect`).
   *
   * `projectId` 를 함께 들고 있는 이유는 아래 `keepLastSeen` 주석 참고.
   */
  const [result, setResult] = useState<{
    key: string;
    projectId: string;
    project?: ProjectDetail;
    hasFailed?: boolean;
  } | null>(null);
  const [membersResult, setMembersResult] = useState<{
    key: string;
    projectId: string;
    members?: ProjectMember[];
    hasFailed?: boolean;
  } | null>(null);
  /** 스텝 권한 섹션의 목록 — 스텝 이름만 쓰므로 상세와 따로 읽는다 */
  const [boardResult, setBoardResult] = useState<{
    key: string;
    projectId: string;
    stages?: ProjectStage[];
    steps?: ProjectStep[];
    hasFailed?: boolean;
  } | null>(null);

  const requestKey = `${projectId}#${reloadCount}`;
  const membersRequestKey = `${projectId}#${membersReloadCount}`;

  /**
   * **다시 읽는 동안에도 직전 값을 그대로 보여준다** (stale-while-revalidate).
   *
   * ⚠️ 열쇠가 어긋난 순간 `null` 로 떨어뜨리면, 상태 변경 한 번에 네 섹션이 전부
   *    `불러오는 중…` 으로 접혔다가 다시 펴진다 — 화면 높이가 크게 출렁이고
   *    스크롤 위치까지 밀린다. 값이 바뀌지 않은 재조회가 대부분이라 손해가 크다.
   * ⛔ **다른 프로젝트의 값은 절대 보여주지 않는다** — 열쇠가 아니라 `projectId` 로
   *    한 번 더 거른다 (사이드바로 다른 프로젝트에 들어가면 즉시 비운다).
   */
  function keepLastSeen<T extends { projectId: string }>(value: T | null) {
    return value?.projectId === projectId ? value : null;
  }

  const current = keepLastSeen(result);
  const currentMembers = keepLastSeen(membersResult);
  const currentBoard = keepLastSeen(boardResult);

  const project = current?.project ?? null;
  const members = currentMembers?.members ?? null;

  /*
   * 실패 화면은 **이번 요청이 실패했을 때만** 띄운다.
   * 낡은 값이 남아 있어도 방금 조회가 깨졌으면 그대로 알린다 (조용히 옛 값을 보여주지 않는다).
   */
  const hasFailed = result?.key === requestKey && Boolean(result.hasFailed);
  const haveMembersFailed =
    membersResult?.key === membersRequestKey &&
    Boolean(membersResult.hasFailed);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProject(projectId, signal)
      .then((loaded) =>
        setResult({ key: requestKey, projectId, project: loaded }),
      )
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) {
          setResult({ key: requestKey, projectId, hasFailed: true });
        }
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  /*
   * 단계 · 스텝 목록. 상세와 같은 열쇠를 쓰므로 `다시 불러오기` 한 번에 함께 갱신된다.
   * 실패해도 위쪽 네 섹션은 그대로 쓸 수 있어야 해서 상세와 나눠 둔다.
   */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([
      getProjectStages(projectId, signal),
      getProjectSteps(projectId, signal),
    ])
      .then(([stages, steps]) =>
        setBoardResult({ key: requestKey, projectId, stages, steps }),
      )
      .catch(() => {
        if (!signal.aborted) {
          setBoardResult({ key: requestKey, projectId, hasFailed: true });
        }
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  // 참여자는 따로 읽는다 — 프로젝트 정보 저장이 참여자 목록을 흔들 이유가 없다
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectMembers(projectId, signal)
      .then((loaded) =>
        setMembersResult({
          key: membersRequestKey,
          projectId,
          members: loaded,
        }),
      )
      .catch(() => {
        if (!signal.aborted) {
          setMembersResult({
            key: membersRequestKey,
            projectId,
            hasFailed: true,
          });
        }
      });

    return () => controller.abort();
  }, [projectId, membersRequestKey]);

  /** 상세를 다시 읽는다 — 409 뒤 "다시 불러오기" 도 이 길로 나온다 */
  function reloadProject() {
    setReloadCount((count) => count + 1);
  }

  function reloadMembers() {
    setMembersReloadCount((count) => count + 1);
  }

  /**
   * 저장 응답이 준 **새 `version`** 을 화면 상태에 꽂는다.
   * 이걸 빼먹으면 같은 화면에서의 다음 저장이 전부 409 다.
   *
   * ⚠️ **이것만으로는 화면 값이 최신이 되지 않는다.** 수정 응답에는 `description` 처럼
   *    빠진 필드가 있어 다른 필드까지 갈아끼울 수 없다 — 값을 바꾼 섹션은 이 함수와 함께
   *    `onReload()` 로 상세를 다시 읽어 서버 값에 맞춘다 (`ProjectInfoForm` · `ProjectStatusSection`).
   */
  function syncVersion(version: number) {
    setResult((previous) =>
      previous?.project
        ? { ...previous, project: { ...previous.project, version } }
        : previous,
    );
  }

  if (hasFailed) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-bg-soft px-4 py-3 text-label break-keep text-text-danger">
          프로젝트를 불러오지 못했습니다. 삭제됐거나 접근 권한이 없을 수
          있습니다.
        </p>
        <button
          type="button"
          onClick={reloadProject}
          className="mt-3 cursor-pointer rounded-lg border border-border-default px-4 py-2 text-label font-medium text-text-primary hover:bg-bg-hover"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const canEdit = project?.myPermission === 'EDITOR';

  return (
    <div className="mx-auto max-w-[880px] p-6">
      <h1 className="text-heading-m font-bold text-text-primary">
        프로젝트 설정
      </h1>
      <p className="mt-1.5 text-label break-keep text-text-secondary">
        과업 정보 · 진행 상태 · 사업 카테고리 · 참여자를 관리합니다.
      </p>

      {project && !canEdit && (
        <p className="mt-4 rounded-lg bg-yellow-bg-soft px-4 py-3 text-detail break-keep text-yellow-text">
          이 프로젝트에서는 <strong>열람 권한(VIEWER)</strong>만 있어 설정을
          바꿀 수 없습니다. 편집 권한이 필요하면 참여자 관리 권한을 가진
          사람에게 요청해주세요.
        </p>
      )}

      <div className="mt-6 space-y-6">
        <ProjectInfoForm
          projectId={projectId}
          project={project}
          canEdit={canEdit}
          onSaved={syncVersion}
          onReload={reloadProject}
        />

        <ProjectStatusSection
          projectId={projectId}
          project={project}
          canEdit={canEdit}
          onSaved={syncVersion}
          onClosed={reloadProject}
          onReload={reloadProject}
        />

        <ProjectCategorySection
          projectId={projectId}
          categories={project?.businessCategories ?? null}
          canEdit={canEdit}
          onChanged={reloadProject}
        />

        <ProjectMemberSection
          projectId={projectId}
          members={members}
          hasFailed={haveMembersFailed}
          canEdit={canEdit}
          onChanged={reloadMembers}
        />

        {/* 참여자 바로 아래 — "이 사람에게 어느 스텝을 열어줄지" 로 흐름이 이어진다 */}
        <StepPermissionSection
          projectId={projectId}
          stages={currentBoard?.stages ?? null}
          steps={currentBoard?.steps ?? null}
          hasFailed={currentBoard?.hasFailed ?? false}
          canEdit={canEdit}
          onChanged={reloadProject}
        />

        {/* 되돌릴 수 없는 조작이라 맨 아래 — `EDITOR` 에게만 보인다 */}
        {canEdit && (
          <DeleteProjectSection
            projectId={projectId}
            project={project}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}
