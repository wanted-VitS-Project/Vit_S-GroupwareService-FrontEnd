'use client';

import { useModalTarget } from '@/lib/useModal';

import StagePermissionModal from '../stage/StagePermissionModal';
import StepPermissionModal from '../step/StepPermissionModal';
import type { ProjectStage, ProjectStep } from '../types';
import SettingsSection from './SettingsSection';

/** 스테이지 없는 스텝을 담는 화면 안쪽 열쇠 — 서버로 나가지 않는다 */
const UNASSIGNED_KEY = -1;

/** 열려 있는 모달 — 대상이 스텝이냐 스테이지냐로 갈린다 */
type PermissionTarget =
  { kind: 'step'; step: ProjectStep } | { kind: 'stage'; stage: ProjectStage };

interface StepPermissionSectionProps {
  projectId: string;
  stages: ProjectStage[] | null;
  steps: ProjectStep[] | null;
  hasFailed: boolean;
  /** 프로젝트 `EDITOR` — 스텝 권한 API 는 스텝 권한이 아니라 이 값을 본다 */
  canEdit: boolean;
  /** 기존 스텝에 기본값을 적용했으면 목록을 다시 읽는다 */
  onChanged: () => void;
}

/**
 * 스텝별 권한을 **설정 화면에서도** 관리한다. (.ai/API.md 128 · 134~136)
 *
 * 사이드바 `⋯` 메뉴에 같은 진입점이 있지만, 그쪽은 **스텝 하나를 다룰 때** 쓰는 자리다.
 * "이 사람에게 어느 스텝을 열어줄지" 를 훑어보며 정하려면 스텝을 하나씩 찾아 호버해야 해서
 * 여기 **전체 목록**을 함께 둔다 — 참여자 관리 바로 아래라 흐름이 이어진다.
 *
 * ⚠️ 진입점이 둘이지만 **모달은 같은 것을 쓴다** — 화면마다 다르게 동작하면 안 된다.
 */
export default function StepPermissionSection({
  projectId,
  stages,
  steps,
  hasFailed,
  canEdit,
  onChanged,
}: StepPermissionSectionProps) {
  const modal = useModalTarget<PermissionTarget>();

  /** 스테이지별로 묶는다. `미분류` 는 스텝이 있을 때만 맨 뒤에 붙인다 */
  const buckets = stages
    ? [
        ...stages.map((stage) => ({
          stage,
          steps: (steps ?? []).filter((step) => step.stageId === stage.stageId),
        })),
        {
          stage: null,
          steps: (steps ?? []).filter((step) => step.stageId === null),
        },
      ].filter((bucket) => bucket.stage !== null || bucket.steps.length > 0)
    : null;

  return (
    <SettingsSection
      title="스테이지 · 스텝 권한"
      description="스테이지 권한은 그 스테이지에 새 스텝이 생성될 때 기본값으로 적용됩니다. 스텝 권한은 스텝마다 따로 열람 · 편집 · 차단을 지정하며, 지정하지 않은 스텝은 위 참여자 권한을 그대로 따릅니다."
    >
      {!canEdit ? (
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
          스텝 권한은 프로젝트 편집 권한이 있어야 볼 수 있습니다.
        </p>
      ) : hasFailed ? (
        <div className="rounded-lg bg-red-bg-soft px-3 py-2.5">
          <p className="text-detail break-keep text-text-danger">
            스테이지 · 스텝을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={onChanged}
            className="mt-2 cursor-pointer text-caption font-medium text-text-primary-blue hover:underline"
          >
            다시 시도
          </button>
        </div>
      ) : !buckets ? (
        <p className="text-detail text-text-secondary">불러오는 중…</p>
      ) : buckets.length === 0 ? (
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
          등록된 스테이지가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {buckets.map((bucket) => {
            /*
             * 지역 변수로 받아 좁힘을 유지한다 — `bucket.stage &&` 로 건 좁힘은
             * `onClick` 콜백 안까지 따라오지 않아 `ProjectStage | null` 로 되돌아간다.
             */
            const { stage } = bucket;

            return (
              <li
                key={stage?.stageId ?? UNASSIGNED_KEY}
                className="overflow-hidden rounded-lg border border-border-default"
              >
                <div className="flex items-center gap-2 bg-bg-surface px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-detail font-semibold text-text-primary">
                    {stage?.name ?? '미분류 (스테이지 없음)'}
                  </span>
                  {/*
                  스테이지 권한(= 새 스텝 기본값)은 **스테이지에만** 있다 — 미소속 스텝은
                  프로젝트 권한을 그대로 상속하므로 걸어 둘 자리가 없다 (STG-004).
                */}
                  {stage && (
                    <button
                      type="button"
                      onClick={() => modal.open({ kind: 'stage', stage })}
                      className="shrink-0 cursor-pointer rounded-button-sm px-2 py-1 text-caption font-medium whitespace-nowrap text-text-primary-blue hover:bg-blue-bg-soft"
                    >
                      스테이지 권한
                    </button>
                  )}
                </div>

                <ul className="divide-y divide-border-default border-t border-border-default">
                  {bucket.steps.length === 0 ? (
                    <li className="px-3 py-2 text-caption text-text-muted">
                      등록된 스텝이 없습니다.
                    </li>
                  ) : (
                    bucket.steps.map((step) => (
                      <li
                        key={step.stepId}
                        className="flex items-center gap-2 bg-bg-card px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-detail text-text-primary">
                          {step.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => modal.open({ kind: 'step', step })}
                          className="shrink-0 cursor-pointer rounded-button-sm px-2 py-1 text-caption font-medium whitespace-nowrap text-text-primary-blue hover:bg-blue-bg-soft"
                        >
                          스텝 권한
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {modal.target?.kind === 'step' && (
        <StepPermissionModal
          stepId={modal.target.step.stepId}
          stepName={modal.target.step.name}
          onClose={modal.close}
        />
      )}
      {modal.target?.kind === 'stage' && (
        <StagePermissionModal
          projectId={projectId}
          stageId={modal.target.stage.stageId}
          stageName={modal.target.stage.name}
          onClose={modal.close}
          onApplied={onChanged}
        />
      )}
    </SettingsSection>
  );
}
