'use client';

import { useEffect, useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';

import {
  getAdminTreeProjects,
  getAdminTreeStages,
  getAdminTreeSteps,
} from './api';
import type { AdminTreeProject, AdminTreeStage, AdminTreeStep } from './types';

/**
 * 전사 파일을 탐색기처럼 훑는 화면 (프로젝트 → 스테이지 → 스텝 → 파일).
 * 탐색 전용 ADMIN API 를 써 노드를 열 때마다 자식만 부른다.
 */

/**
 * 프로젝트 목록 상한. 서버가 100 으로 자른다.
 * 더 큰 값을 보내면 못 받은 프로젝트가 있는데도 다 받은 것처럼 보인다.
 */
const PROJECT_LIMIT = 100;

/**
 * 스테이지에 배정되지 않은 스텝을 담는 칸.
 * 서버는 null 로 주지만 위치가 URL 에 담겨 문자열로 바꿔 쓴다.
 */
const NO_STAGE = 'none';

/**
 * 지금 위치. id 만 담는다.
 * 이름까지 실으면 주소가 길어지고 이름을 바꾼 뒤 옛 이름이 남는다.
 */
export interface ExplorerPath {
  projectId?: number;
  /** NO_STAGE 면 스테이지에 배정되지 않은 스텝 묶음이다 */
  stageId?: number | typeof NO_STAGE;
  stepId?: number;
}

export { NO_STAGE };

export default function AdminFileExplorer({
  path,
  onChange,
}: {
  /** 지금 위치. 상태는 부모가 들고 있다. 파일 표도 같은 값을 봐야 한다 */
  path: ExplorerPath;
  onChange: (next: ExplorerPath) => void;
}) {
  const [projects, setProjects] = useState<AdminTreeProject[] | null>(null);
  /**
   * 상한에 걸려 못 받은 프로젝트 수. 0 이면 다 받았다.
   * 잘린 사실을 적지 않으면 그 프로젝트가 없다고 읽는다.
   */
  const [hiddenProjectCount, setHiddenProjectCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  /* 1단계 — 전사 프로젝트 */
  useEffect(() => {
    const controller = new AbortController();

    getAdminTreeProjects({ page: 0, size: PROJECT_LIMIT }, controller.signal)
      .then((data) => {
        setProjects(data.content);
        setHiddenProjectCount(
          Math.max(data.totalElements - data.content.length, 0),
        );
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setErrorMessage(explorerErrorMessage(caught, '프로젝트'));
        }
      });

    return () => controller.abort();
  }, []);

  /**
   * 2단계 — 고른 프로젝트의 스테이지.
   * 결과에 어느 프로젝트의 것인지 함께 담아 옮기면 자동으로 로딩 상태가 되게 한다.
   */
  const [stageResult, setStageResult] = useState<{
    projectId: number;
    stages?: AdminTreeStage[];
    /** 못 본 이유. 권한 없음과 조회 실패는 사용자가 할 일이 다르다 */
    blockedReason?: string;
  } | null>(null);

  const projectId = path.projectId;
  /** 지금 프로젝트의 결과만 화면에 쓴다. 옮기는 중이면 로딩으로 본다 */
  const currentStages =
    stageResult !== null && stageResult.projectId === projectId
      ? stageResult
      : null;
  const stages = currentStages?.stages ?? null;
  const blockedReason = currentStages?.blockedReason;

  useEffect(() => {
    if (projectId === undefined) return;

    const controller = new AbortController();

    getAdminTreeStages(projectId, controller.signal)
      .then((nextStages) => setStageResult({ projectId, stages: nextStages }))
      .catch((caught) => {
        if (controller.signal.aborted) return;

        setStageResult({
          projectId,
          blockedReason: explorerErrorMessage(caught, '스테이지', true),
        });
      });

    return () => controller.abort();
  }, [projectId]);

  /**
   * 3단계 — 고른 스테이지의 스텝.
   * 미분류 칸이면 stageId 를 빼고 부른다. 그게 미분류 스텝을 받는 방법이다.
   */
  const [stepResult, setStepResult] = useState<{
    key: string;
    steps?: AdminTreeStep[];
    blockedReason?: string;
  } | null>(null);

  const stageId = path.stageId;
  const stepKey = `${projectId ?? ''} ${stageId ?? ''}`;
  const currentSteps = stepResult?.key === stepKey ? stepResult : null;
  const steps = currentSteps?.steps ?? null;

  useEffect(() => {
    if (projectId === undefined || stageId === undefined) return;

    const controller = new AbortController();

    getAdminTreeSteps(
      projectId,
      stageId === NO_STAGE ? undefined : stageId,
      controller.signal,
    )
      .then((nextSteps) => setStepResult({ key: stepKey, steps: nextSteps }))
      .catch((caught) => {
        if (controller.signal.aborted) return;

        setStepResult({
          key: stepKey,
          blockedReason: explorerErrorMessage(caught, '스텝', true),
        });
      });

    return () => controller.abort();
  }, [stepKey, projectId, stageId]);

  /** 경로 막대에 쓸 이름. 목록이 오기 전에는 자리만 잡는다 */
  const projectName = projects?.find(
    (project) => project.projectId === projectId,
  )?.name;
  const stageName = stages?.find((stage) =>
    path.stageId === NO_STAGE
      ? stage.stageId === null
      : stage.stageId === path.stageId,
  )?.name;
  const stepName = steps?.find((step) => step.stepId === path.stepId)?.name;

  const levelBlockedReason =
    path.stageId === undefined
      ? blockedReason
      : (currentSteps?.blockedReason ?? blockedReason);

  return (
    <div>
      <PathBar
        path={path}
        names={{ project: projectName, stage: stageName, step: stepName }}
        onMove={onChange}
      />

      {errorMessage && (
        <p role="alert" className="mt-3 text-caption text-text-danger">
          {errorMessage}
        </p>
      )}

      {/* 목록 대신 나오는 안내라 눈으로만 보이면 낭독에서는 빈 목록으로 읽힌다 */}
      {levelBlockedReason && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-border-default bg-bg-surface px-4 py-6 text-center text-caption break-keep text-text-secondary"
        >
          {levelBlockedReason}
        </p>
      )}

      {/**
       * 고른 뒤에도 형제 목록을 그대로 둔다.
       * 자리만 표시하고 목록을 남기면 한 번 눌러 옆으로 옮길 수 있다.
       */}
      <ul className="mt-3 flex flex-col gap-1.5">
        {path.projectId === undefined
          ? projects?.map((project) => (
              <EntryRow
                key={project.projectId}
                icon="project"
                label={project.name}
                // 발주처가 없는 프로젝트가 있어 있을 때만 적는다
                hint={project.clientName ?? undefined}
                onOpen={() => onChange({ projectId: project.projectId })}
              />
            ))
          : path.stageId === undefined
            ? stages?.map((stage) => (
                <EntryRow
                  key={stage.stageId ?? NO_STAGE}
                  icon="stage"
                  label={stage.name}
                  onOpen={() =>
                    onChange({
                      ...path,
                      stageId: stage.stageId ?? NO_STAGE,
                    })
                  }
                />
              ))
            : steps?.map((step) => (
                <EntryRow
                  key={step.stepId}
                  icon="step"
                  isCurrent={step.stepId === path.stepId}
                  label={step.name}
                  onOpen={() => onChange({ ...path, stepId: step.stepId })}
                />
              ))}

        {path.projectId === undefined && hiddenProjectCount > 0 && (
          <li
            role="status"
            className="rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary"
          >
            프로젝트 {hiddenProjectCount}개는 이 목록에 나오지 않습니다. 아직
            목록 넘김이 없어 이름순 처음 {PROJECT_LIMIT}개까지만 보입니다.
          </li>
        )}

        {levelBlockedReason === undefined &&
          isEmptyLevel(path, projects, stages, steps) && (
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
 * 마지막 조각은 이미 그 자리라 누를 수 없다.
 */
function PathBar({
  path,
  names,
  onMove,
}: {
  path: ExplorerPath;
  /** 아직 목록이 안 왔으면 그 조각은 자리만 잡는다 */
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

/** 한 줄은 들어갈 수 있는 자리 하나다 */
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
          <span className="max-w-40 shrink-0 truncate text-caption text-text-secondary">
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

/** 단계마다 다른 색을 준다. 경로를 안 읽어도 지금 어느 깊이인지 알 수 있다 */
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
 * 못 본 이유를 사용자가 할 일로 옮긴다. 403 은 실패가 아니다.
 * 404 는 어디서 받았는지가 문구를 가른다. 프로젝트 목록에는 찍은 id 가 없다.
 */
function explorerErrorMessage(
  caught: unknown,
  level: string,
  /** 특정 id 를 찍어 부른 단계인지 (스테이지 · 스텝) */
  isTargeted = false,
) {
  if (caught instanceof ApiError) {
    if (caught.status === 403) {
      return '전사 파일은 관리자만 볼 수 있습니다.';
    }
    if (caught.status === 404 && isTargeted) {
      return '삭제되었거나 없는 항목입니다. 목록을 다시 열어주세요.';
    }
  }

  return messageOf(caught, `${level} 목록을 불러오지 못했습니다.`);
}

function isEmptyLevel(
  path: ExplorerPath,
  projects: AdminTreeProject[] | null,
  stages: AdminTreeStage[] | null,
  steps: AdminTreeStep[] | null,
) {
  if (path.projectId === undefined) return projects?.length === 0;
  if (path.stageId === undefined) return stages?.length === 0;
  return steps?.length === 0;
}
