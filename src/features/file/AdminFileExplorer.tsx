'use client';

import { useEffect, useState } from 'react';

import {
  getProjects,
  getProjectStages,
  getProjectSteps,
} from '@/features/project/api';
import type {
  ProjectListItem,
  ProjectStage,
  ProjectStep,
} from '@/features/project/types';
import { ApiError, messageOf } from '@/lib/api';

import { getAdminFiles } from './api';
import type { AdminFile } from './types';

/**
 * 전사 파일을 **탐색기처럼** 훑는 화면 (`프로젝트 → 스테이지 → 스텝 → 파일`).
 *
 * ℹ️ 한 번에 트리를 주는 API 가 없어 단계마다 다른 API 를 쓴다 —
 *    `GET /projects`(ADMIN 은 전 건) · `/projects/{id}/stages` · `/steps` · `/admin/files?projectId=`.
 * ⚠️ 스텝 필터가 API 에 없어 **프로젝트 단위로 받아 화면에서 나눈다.**
 *    한 프로젝트가 500건을 넘으면 뒤는 보이지 않는다 — 그때 `?stepId=` 를 요청한다.
 */

/** 한 프로젝트에서 한 번에 받아 둘 파일 수 상한 (100 × 5) */
const FILE_PAGE_SIZE = 100;
const FILE_FETCH_PAGES = 5;

/** 프로젝트 목록 상한 — 전사 프로젝트가 이보다 많아지면 검색을 붙인다 */
const PROJECT_LIMIT = 200;

/** 스테이지에 배정되지 않은 스텝을 담는 칸 */
const NO_STAGE = 'none';

/**
 * 지금 위치 — **id 만** 담는다.
 *
 * ⚠️ 이름을 함께 담지 않는다. 이 값은 URL 로 오가는데(`?projectId=…`), 이름까지 실으면
 *    주소가 길어지고 프로젝트명을 바꾼 뒤 옛 이름이 남는다. 이름은 받아온 목록에서 찾는다.
 */
export interface ExplorerPath {
  projectId?: number;
  /** `NO_STAGE`(`'none'`) 면 스테이지에 배정되지 않은 스텝 묶음 */
  stageId?: number | typeof NO_STAGE;
  stepId?: number;
}

export { NO_STAGE };

export default function AdminFileExplorer({
  path,
  onChange,
}: {
  /** 지금 위치. 상태는 **부모가 들고 있다** — 파일 표도 같은 값을 봐야 한다 */
  path: ExplorerPath;
  onChange: (next: ExplorerPath) => void;
}) {
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  /* 1단계 — 전사 프로젝트 */
  useEffect(() => {
    const controller = new AbortController();

    getProjects({ page: 0, size: PROJECT_LIMIT }, controller.signal)
      .then((data) => setProjects(data.content))
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setErrorMessage(messageOf(caught, '프로젝트를 불러오지 못했습니다.'));
        }
      });

    return () => controller.abort();
  }, []);

  /**
   * 2 · 3단계 — 고른 프로젝트의 스테이지 · 스텝 · 파일.
   *
   * ⚠️ 결과에 **어느 프로젝트의 것인지**를 함께 담는다. 프로젝트를 옮기면 키가 어긋나
   *    자동으로 로딩 상태가 되므로, 효과 본문에서 상태를 비울 필요가 없다.
   */
  const [inside, setInside] = useState<{
    projectId: number;
    stages: ProjectStage[];
    steps: ProjectStep[];
    files: AdminFile[];
    /** 못 본 이유 — 권한 없음과 조회 실패는 사용자가 할 일이 다르다 */
    blockedReason?: string;
  } | null>(null);

  const projectId = path.projectId;
  const current = inside?.projectId === projectId ? inside : null;
  const stages = current?.stages ?? null;
  const steps = current?.steps ?? null;
  const files = current?.files ?? null;

  useEffect(() => {
    if (projectId === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    /**
     * 셋을 함께 기다린다 — 스테이지만 먼저 그리면 스텝 수가 나중에 붙어 목록이 들썩인다.
     * 파일도 여기서 받아 둔다. 스텝마다 다시 부르면 같은 응답을 반복해서 받는다.
     */
    Promise.all([
      getProjectStages(projectId, signal),
      getProjectSteps(projectId, signal),
      fetchProjectFiles(projectId, signal),
    ])
      .then(([nextStages, nextSteps, nextFiles]) =>
        setInside({
          projectId,
          stages: nextStages,
          steps: nextSteps,
          files: nextFiles,
        }),
      )
      .catch((caught) => {
        if (signal.aborted) return;

        /**
         * ⚠️ 403 은 **실패가 아니다.** 관리자라도 참여하지 않은 프로젝트의 스테이지 · 스텝은
         *    볼 수 없다. `불러오지 못했습니다` 로 알리면 고장으로 읽혀 새로고침만 반복하게 된다.
         */
        const isForbidden = caught instanceof ApiError && caught.status === 403;

        setInside({
          projectId,
          stages: [],
          steps: [],
          files: [],
          blockedReason: isForbidden
            ? '이 프로젝트를 볼 권한이 없습니다. 프로젝트 참여자에게 요청해주세요.'
            : messageOf(caught, '프로젝트 안을 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [projectId]);

  const stepsOfStage =
    steps === null || path.stageId === undefined
      ? null
      : steps.filter((step) =>
          path.stageId === NO_STAGE
            ? step.stageId === null
            : step.stageId === path.stageId,
        );

  /** 경로 막대에 쓸 이름 — 목록이 오기 전에는 비워 두고 자리만 잡는다 */
  const projectName = projects?.find(
    (project) => project.projectId === projectId,
  )?.name;
  const stageName =
    path.stageId === NO_STAGE
      ? '스테이지 미지정'
      : stages?.find((stage) => stage.stageId === path.stageId)?.name;
  const stepName = steps?.find((step) => step.stepId === path.stepId)?.name;

  return (
    <div>
      <PathBar
        path={path}
        names={{ project: projectName, stage: stageName, step: stepName }}
        onMove={onChange}
      />

      {errorMessage && (
        <p className="mt-3 text-caption text-text-danger">{errorMessage}</p>
      )}

      {current?.blockedReason && (
        <p className="mt-3 rounded-lg border border-border-default bg-bg-surface px-4 py-6 text-center text-caption break-keep text-text-secondary">
          {current.blockedReason}
        </p>
      )}

      {/**
       * ⭐ **고른 뒤에도 형제 목록을 그대로 둔다.**
       *
       * 스텝을 고르면 목록을 치우던 때에는 옆 스텝을 보려고 경로 막대로 한 번 올라갔다
       * 다시 내려와야 했다. 지금 자리를 표시(`aria-current`)만 하고 목록은 남겨 두면
       * 한 번 눌러 옆으로 옮길 수 있다.
       */}
      <ul className="mt-3 flex flex-col gap-1.5">
        {path.projectId === undefined
          ? projects?.map((project) => (
              <EntryRow
                key={project.projectId}
                icon="project"
                label={project.name}
                onOpen={() => onChange({ projectId: project.projectId })}
              />
            ))
          : path.stageId === undefined
            ? stageEntries(stages, steps).map((stage) => (
                <EntryRow
                  key={String(stage.id)}
                  icon="stage"
                  label={stage.name}
                  hint={`스텝 ${stage.stepCount}개`}
                  onOpen={() => onChange({ ...path, stageId: stage.id })}
                />
              ))
            : stepsOfStage?.map((step) => (
                <EntryRow
                  key={step.stepId}
                  icon="step"
                  isCurrent={step.stepId === path.stepId}
                  label={step.name}
                  hint={`파일 ${countFiles(files, step.stepId)}개`}
                  onOpen={() => onChange({ ...path, stepId: step.stepId })}
                />
              ))}

        {current?.blockedReason === undefined &&
          isEmptyLevel(path, projects, stages, steps, stepsOfStage) && (
            <li className="rounded-lg border border-border-default px-4 py-8 text-center text-caption text-text-secondary">
              {path.projectId === undefined
                ? '프로젝트가 없습니다.'
                : path.stageId === undefined
                  ? '스테이지가 없습니다.'
                  : '스텝이 없습니다.'}
            </li>
          )}
      </ul>
    </div>
  );
}

/**
 * 지금 위치. 각 조각을 누르면 그 단계로 되돌아간다.
 * ⚠️ 마지막 조각은 누를 수 없다 — 이미 그 자리라 눌러도 아무 일이 없으면 고장으로 읽힌다.
 */
function PathBar({
  path,
  names,
  onMove,
}: {
  path: ExplorerPath;
  /** 아직 목록이 안 왔으면 `undefined` — 그 조각은 자리만 잡는다 */
  names: { project?: string; stage?: string; step?: string };
  onMove: (next: ExplorerPath) => void;
}) {
  const crumbs: { key: string; label: string; next: ExplorerPath }[] = [
    { key: 'root', label: '전체', next: {} },
  ];

  if (path.projectId !== undefined) {
    crumbs.push({
      key: 'project',
      label: names.project ?? '…',
      next: { projectId: path.projectId },
    });
  }
  if (path.projectId !== undefined && path.stageId !== undefined) {
    crumbs.push({
      key: 'stage',
      label: names.stage ?? '…',
      next: { projectId: path.projectId, stageId: path.stageId },
    });
  }
  if (path.stepId !== undefined) {
    crumbs.push({
      key: 'step',
      label: names.step ?? '…',
      next: path,
    });
  }

  return (
    <nav
      aria-label="파일 위치"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border-default bg-bg-surface px-3 py-2"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span key={crumb.key} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden className="text-text-muted">
                ›
              </span>
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="max-w-60 truncate text-caption font-semibold text-text-primary"
              >
                {crumb.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onMove(crumb.next)}
                className="max-w-60 cursor-pointer truncate rounded-button-sm px-1.5 py-0.5 text-caption text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                {crumb.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** 한 줄 = 들어갈 수 있는 자리 하나 */
function EntryRow({
  icon,
  label,
  hint,
  isCurrent = false,
  onOpen,
}: {
  icon: 'project' | 'stage' | 'step';
  label: string;
  hint?: string;
  /** 지금 파일을 보고 있는 자리 */
  isCurrent?: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={isCurrent ? 'true' : undefined}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left ${
          isCurrent
            ? 'border-border-primary bg-blue-bg-soft'
            : 'border-border-default hover:bg-bg-hover'
        }`}
      >
        <FolderIcon tone={icon} />
        <span className="min-w-0 flex-1 truncate text-label font-medium text-text-primary">
          {label}
        </span>
        {hint && (
          <span className="shrink-0 text-caption text-text-secondary">
            {hint}
          </span>
        )}
        <span aria-hidden className="shrink-0 text-text-muted">
          ›
        </span>
      </button>
    </li>
  );
}

/** 단계마다 다른 색을 준다 — 경로를 안 읽어도 지금 어느 깊이인지 알 수 있다 */
function FolderIcon({ tone }: { tone: 'project' | 'stage' | 'step' }) {
  const toneClass =
    tone === 'project'
      ? 'bg-blue-bg-soft text-blue-text'
      : tone === 'stage'
        ? 'bg-purple-bg-soft text-purple-text'
        : 'bg-green-bg text-green-text';

  return (
    <span
      aria-hidden
      className={`flex size-7 shrink-0 items-center justify-center rounded-button-sm ${toneClass}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    </span>
  );
}

/**
 * 스테이지 칸 목록. 미소속 스텝이 있으면 **맨 뒤에 한 칸**을 더 만든다 —
 * 스테이지에 배정되지 않은 스텝이 어디에도 안 보이면 파일을 영영 못 찾는다.
 */
function stageEntries(
  stages: ProjectStage[] | null,
  steps: ProjectStep[] | null,
) {
  if (stages === null) return [];

  const entries = stages.map((stage) => ({
    id: stage.stageId as number | typeof NO_STAGE,
    name: stage.name,
    stepCount: stage.stepCount,
  }));

  const orphanCount =
    steps?.filter((step) => step.stageId === null).length ?? 0;

  if (orphanCount > 0) {
    entries.push({
      id: NO_STAGE,
      name: '스테이지 미지정',
      stepCount: orphanCount,
    });
  }

  return entries;
}

function countFiles(files: AdminFile[] | null, stepId: number) {
  return files?.filter((file) => file.stepId === stepId).length ?? 0;
}

function isEmptyLevel(
  path: ExplorerPath,
  projects: ProjectListItem[] | null,
  stages: ProjectStage[] | null,
  steps: ProjectStep[] | null,
  stepsOfStage: ProjectStep[] | null,
) {
  if (path.projectId === undefined) return projects?.length === 0;
  if (path.stageId === undefined) {
    return (
      stages !== null &&
      steps !== null &&
      stageEntries(stages, steps).length === 0
    );
  }
  return stepsOfStage?.length === 0;
}

/**
 * 한 프로젝트의 파일을 모아 받는다.
 * ⚠️ 스텝 단위 필터가 API 에 없어 **프로젝트 단위로 받아 화면에서 나눈다.**
 *    상한(500건)을 넘기면 뒤는 받지 않는다 — 더 필요해지면 `?stepId=` 를 요청한다.
 */
async function fetchProjectFiles(projectId: number, signal: AbortSignal) {
  const collected: AdminFile[] = [];

  for (let page = 0; page < FILE_FETCH_PAGES; page += 1) {
    const result = await getAdminFiles(
      { projectId, page, size: FILE_PAGE_SIZE },
      signal,
    );

    collected.push(...result.content);

    if (page >= result.totalPages - 1) break;
  }

  return collected;
}
