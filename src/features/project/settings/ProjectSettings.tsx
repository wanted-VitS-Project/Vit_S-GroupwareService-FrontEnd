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
   */
  const [result, setResult] = useState<{
    key: string;
    project?: ProjectDetail;
    hasFailed?: boolean;
  } | null>(null);
  const [membersResult, setMembersResult] = useState<{
    key: string;
    members?: ProjectMember[];
    hasFailed?: boolean;
  } | null>(null);
  /** 스텝 권한 섹션의 목록 — 스텝 이름만 쓰므로 상세와 따로 읽는다 */
  const [boardResult, setBoardResult] = useState<{
    key: string;
    stages?: ProjectStage[];
    steps?: ProjectStep[];
    hasFailed?: boolean;
  } | null>(null);

  const requestKey = `${projectId}#${reloadCount}`;
  const membersRequestKey = `${projectId}#${membersReloadCount}`;

  const current = result?.key === requestKey ? result : null;
  const currentMembers =
    membersResult?.key === membersRequestKey ? membersResult : null;
  const currentBoard = boardResult?.key === requestKey ? boardResult : null;

  const project = current?.project ?? null;
  const hasFailed = current?.hasFailed ?? false;
  const members = currentMembers?.members ?? null;
  const haveMembersFailed = currentMembers?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProject(projectId, signal)
      .then((loaded) => setResult({ key: requestKey, project: loaded }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
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
        setBoardResult({ key: requestKey, stages, steps }),
      )
      .catch(() => {
        if (!signal.aborted) {
          setBoardResult({ key: requestKey, hasFailed: true });
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
        setMembersResult({ key: membersRequestKey, members: loaded }),
      )
      .catch(() => {
        if (!signal.aborted) {
          setMembersResult({ key: membersRequestKey, hasFailed: true });
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
      </div>
    </div>
  );
}
