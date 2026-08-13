'use client';

import { useMemo, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';
import { useFlipReorder } from '@/lib/useFlipReorder';
import { useModalTarget } from '@/lib/useModal';

import { updateStageOrder, updateStepOrder } from '../api';
import type {
  ProjectStage,
  ProjectStep,
  StageOrderItem,
  StepOrderItem,
} from '../types';
import StageDeleteModal from './StageDeleteModal';
import StageFormModal from './StageFormModal';

/** 열려 있는 하위 모달 — 대상 없이 열리는 `추가` 도 한 종류로 묶는다 */
type StageAction =
  | { kind: 'create' }
  | { kind: 'rename'; stage: ProjectStage }
  | { kind: 'delete'; stage: ProjectStage };

/** 끌고 있는 것. 단계끼리 · 스텝끼리만 자리를 바꾼다 */
type Dragging =
  | { type: 'stage'; index: number }
  | { type: 'step'; bucketIndex: number; index: number };

/** 단계 하나와 그 아래 스텝. `stage: null` 은 맨 끝의 `미분류` 가상 묶음이다 */
interface Bucket {
  stage: ProjectStage | null;
  steps: ProjectStep[];
}

interface StageManageModalProps {
  projectId: string;
  /** 가상 스테이지(`미분류`)는 제외한 실제 목록만 넘긴다 */
  stages: ProjectStage[];
  steps: ProjectStep[];
  onClose: () => void;
  /** 목록이 바뀌었으니 다시 읽으라는 신호. **모달은 닫지 않는다** */
  onChanged: () => void;
}

/**
 * 미분류 묶음을 담을 **화면 안쪽 열쇠**. 서버로 나가지 않는다 —
 * 순서 API 의 미소속은 `null`, 스테이지 삭제의 미소속은 `0` 이라 상수를 돌려쓰면 헷갈린다.
 */
const UNASSIGNED_KEY = -1;

/**
 * 단계 · 스텝을 묶음으로 만든다.
 * `미분류` 는 스텝이 없어도 **항상 마지막에 둔다** — 단계 밖으로 빼낼 자리가 필요하다.
 */
function toBuckets(stages: ProjectStage[], steps: ProjectStep[]): Bucket[] {
  const ordered = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const byStage = new Map<number, ProjectStep[]>();

  for (const step of ordered) {
    const key = step.stageId ?? UNASSIGNED_KEY;
    const bucket = byStage.get(key);
    if (bucket) bucket.push(step);
    else byStage.set(key, [step]);
  }

  return [
    ...stages.map((stage) => ({
      stage,
      steps: byStage.get(stage.stageId) ?? [],
    })),
    { stage: null, steps: byStage.get(UNASSIGNED_KEY) ?? [] },
  ];
}

/** 순서 변경 요청 한 줄 + 아직 못 채운 `version` */
interface StepPlanRow {
  stepId: number;
  stageId: number | null;
  sortOrder: number;
  version?: number;
}

/**
 * 보드를 **위에서 아래로 한 번 훑어** 스텝 번호를 매긴다.
 *
 * ⚠️ `sortOrder` 는 **프로젝트 단위 통번호다** (2026-08-11 BE 확인) — 스테이지마다
 *    1부터 다시 세지 않는다. 그래서 **스테이지 순서만 바꿔도 아래 스텝 번호가 전부 밀린다.**
 *    "단계만 끌었으니 스텝 요청은 생략" 이 성립하지 않는 이유다.
 */
function toStepPlan(buckets: Bucket[]): StepPlanRow[] {
  const plan: StepPlanRow[] = [];
  let sortOrder = 0;

  for (const bucket of buckets) {
    for (const step of bucket.steps) {
      sortOrder += 1;
      plan.push({
        stepId: step.stepId,
        // 미소속은 `null` 이다 — `0` 은 스테이지 삭제 쪽 규약이라 여기선 쓰지 않는다
        stageId: bucket.stage?.stageId ?? null,
        sortOrder,
        version: step.version,
      });
    }
  }

  return plan;
}

/** 보낼 값이 실제로 달라졌는지 — `version` 은 빼고 **위치만** 본다 */
function planPrint(plan: StepPlanRow[]) {
  return plan
    .map((row) => `${row.stepId}>${row.stageId ?? 'null'}#${row.sortOrder}`)
    .join('|');
}

/** 묶음 하나의 내용 — 어느 단계에 어떤 스텝이 어떤 차례로 들었는지 */
function bucketPrint(bucket: Bucket) {
  const stepIds = bucket.steps.map((step) => step.stepId).join(',');
  return `${bucket.stage?.stageId ?? 0}:${stepIds}`;
}

/** 저장 여부 판단용 지문 — 이름이 아니라 **순서와 소속**만 본다 */
function fingerprint(buckets: Bucket[]) {
  return buckets.map(bucketPrint).join('|');
}

/**
 * 초안을 갈아끼울지 판단하는 지문 — 순서 · 소속에 더해 **`version` 까지** 본다.
 *
 * 순서만 보면, 남이 이름만 고쳐 `version` 이 올라간 경우(순서는 그대로)를 놓친다.
 * 그 상태로 초안을 두면 다음 저장이 **옛 `version` 을 실어 무조건 409** 다 —
 * 순서 API 는 `overwrite` 가 없어 거기서 빠져나올 길도 없다.
 */
function syncPrint(buckets: Bucket[]) {
  return buckets
    .map((bucket) => {
      const stage = `${bucket.stage?.stageId ?? 0}@${bucket.stage?.version ?? '-'}`;
      const steps = bucket.steps
        .map((step) => `${step.stepId}@${step.version ?? '-'}`)
        .join(',');
      return `${stage}:${steps}`;
    })
    .join('|');
}

/**
 * `version` 이 하나라도 없으면 **아예 보내지 않는다** — 순서 API 는 항목별로 락을 검사하고
 * 하나만 어긋나도 요청 전체가 409 로 롤백된다. 보내 봐야 전부 실패한다.
 */
function toStageOrders(stages: ProjectStage[]): StageOrderItem[] | null {
  const orders: StageOrderItem[] = [];

  for (const [index, stage] of stages.entries()) {
    if (stage.version === undefined) return null;
    orders.push({
      stageId: stage.stageId,
      sortOrder: index + 1,
      version: stage.version,
    });
  }

  return orders;
}

function toStepOrders(plan: StepPlanRow[]): StepOrderItem[] | null {
  const orders: StepOrderItem[] = [];

  for (const row of plan) {
    if (row.version === undefined) return null;
    orders.push({
      stepId: row.stepId,
      stageId: row.stageId,
      sortOrder: row.sortOrder,
      version: row.version,
    });
  }

  return orders;
}

/**
 * 단계 관리 모달 — `진행 단계` 헤더의 `단계수정` 진입점. (.ai/API.md 112~114 · 119 · 120)
 *
 * 사이드바의 `⋯` 메뉴는 행에 **호버해야** 나타나 처음 쓰는 사람이 찾지 못한다.
 * 여기서는 전체 구조를 펼쳐 놓고 이름 수정 · 삭제 · 추가와 **순서 변경**을 함께 다룬다.
 *
 * 순서는 끌어 놓은 즉시 보내지 않고 `순서 저장` 을 눌러야 나간다 —
 * 두 API 모두 **전체 최종 순서**를 요구해서, 중간 상태를 매번 보내면
 * 아직 옮기는 중인 배치가 남의 화면에 그대로 보인다. (블록 배치 편집과 같은 규칙)
 */
export default function StageManageModal({
  projectId,
  stages,
  steps,
  onClose,
  onChanged,
}: StageManageModalProps) {
  const action = useModalTarget<StageAction>();

  /**
   * 순서가 바뀌는 순간에만 도는 FLIP 이동 애니메이션.
   *
   * 끌어 놓은 뒤 행이 **툭 튀지 않고 미끄러져** 어디로 갔는지 눈으로 따라갈 수 있다.
   * 단계 `<li>` 와 그 안의 스텝 `<li>` 를 함께 등록하지만, 훅이 중첩을 보정해
   * 스텝은 단계가 옮겨 준 만큼을 빼고 자기 몫만 움직인다.
   */
  const slide = useFlipReorder<string>();

  const baseline = useMemo(() => toBuckets(stages, steps), [stages, steps]);
  const baselinePrint = fingerprint(baseline);
  const baselineSyncPrint = syncPrint(baseline);

  const [buckets, setBuckets] = useState(baseline);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  /**
   * 저장이 실패해 화면이 든 `version` 을 더는 믿을 수 없는 상태.
   * 재조회로 새 `version` 을 받기 전에는 다시 보내 봐야 또 409 라 저장을 막는다.
   */
  const [isStale, setIsStale] = useState(false);

  /*
   * 목록을 다시 읽어 왔으면 초안을 갈아끼운다.
   * (effect 가 아니라 렌더 중 상태 조정 — https://react.dev/reference/react/useState)
   *
   * **`version` 이 바뀌기만 해도 갈아끼운다** — 근거가 달라졌으니 끌던 것을 유지하면 안 된다.
   * 끌던 것이 사라지므로, 아래에서 **순서를 고치는 중에는 이름 수정 · 삭제를 막는다.**
   */
  const [syncedPrint, setSyncedPrint] = useState(baselineSyncPrint);
  if (syncedPrint !== baselineSyncPrint) {
    setSyncedPrint(baselineSyncPrint);
    setBuckets(baseline);
    setError('');
    setIsStale(false);
  }

  const isDirty = fingerprint(buckets) !== baselinePrint;

  const stageIds = buckets
    .map((bucket) => bucket.stage?.stageId ?? 0)
    .join(',');
  const baseStageIds = baseline
    .map((bucket) => bucket.stage?.stageId ?? 0)
    .join(',');
  const hasStageOrderChanged = stageIds !== baseStageIds;

  /*
   * 스텝은 보낼 값을 **직접 만들어서** 비교한다.
   * `sortOrder` 가 프로젝트 통번호라 단계만 끌어도 스텝 번호가 밀리므로,
   * "스텝을 안 건드렸으니 생략" 같은 어림짐작이 통하지 않는다.
   */
  const stepPlan = toStepPlan(buckets);
  const hasStepOrderChanged =
    planPrint(stepPlan) !== planPrint(toStepPlan(baseline));

  /** 실제 단계만 (맨 끝 `미분류` 제외) */
  const realStages = buckets
    .map((bucket) => bucket.stage)
    .filter((stage): stage is ProjectStage => stage !== null);

  function moveStage(from: number, to: number) {
    if (from === to || to < 0 || to >= realStages.length) return;

    // 순서를 바꾸기 **직전** 위치를 찍는다 — 매 렌더 재는 것이 아니라 이때만 잰다
    slide.capture();
    setError('');
    setBuckets((previous) => {
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function moveStep(
    from: { bucketIndex: number; index: number },
    to: { bucketIndex: number; index: number },
  ) {
    slide.capture();
    setError('');
    setBuckets((previous) => {
      const next = previous.map((bucket) => ({
        ...bucket,
        steps: [...bucket.steps],
      }));
      const [moved] = next[from.bucketIndex].steps.splice(from.index, 1);
      if (!moved) return previous;

      // 같은 묶음 안에서 아래로 옮기면 앞에서 하나가 빠져 자리가 한 칸 당겨진다
      const shift =
        from.bucketIndex === to.bucketIndex && from.index < to.index ? 1 : 0;
      next[to.bucketIndex].steps.splice(
        Math.max(0, to.index - shift),
        0,
        moved,
      );
      return next;
    });
  }

  /** 키보드용 — 묶음 끝에서 한 번 더 누르면 이웃 묶음으로 넘어간다 */
  function moveStepBy(bucketIndex: number, index: number, delta: -1 | 1) {
    const from = { bucketIndex, index };

    if (delta === -1) {
      if (index > 0) moveStep(from, { bucketIndex, index: index - 1 });
      else if (bucketIndex > 0) {
        moveStep(from, {
          bucketIndex: bucketIndex - 1,
          index: buckets[bucketIndex - 1].steps.length,
        });
      }
      return;
    }

    if (index < buckets[bucketIndex].steps.length - 1) {
      moveStep(from, { bucketIndex, index: index + 1 });
    } else if (bucketIndex < buckets.length - 1) {
      moveStep(from, { bucketIndex: bucketIndex + 1, index: 0 });
    }
  }

  async function saveOrder() {
    if (isSaving || isStale || !isDirty) return;

    const stageOrders = hasStageOrderChanged ? toStageOrders(realStages) : [];
    const stepOrders = hasStepOrderChanged ? toStepOrders(stepPlan) : [];

    if (stageOrders === null || stepOrders === null) {
      setError('버전 정보가 없어 순서를 저장할 수 없습니다. 새로고침해주세요.');
      return;
    }

    setError('');
    setIsSaving(true);

    /**
     * 두 API 는 각각 전체 롤백이지만 **서로는 원자적이지 않다.**
     * 단계가 통과한 뒤 스텝이 409 면 앞의 것만 반영된 상태가 남는다 — 사용자에게 알려야 한다.
     */
    let hasSavedStageOrder = false;

    try {
      if (stageOrders.length > 0) {
        await updateStageOrder(projectId, stageOrders);
        hasSavedStageOrder = true;
      }
      if (stepOrders.length > 0) {
        await updateStepOrder(projectId, stepOrders);
      }
      // 응답의 새 `version` 을 쓰려면 목록을 다시 읽어야 한다 — 초안도 그때 갈린다
      onChanged();
    } catch (caught) {
      /*
       * 실패하면 화면이 든 `version` 은 더 이상 맞지 않는다 —
       * 앞 요청이 통과했다면 그쪽이 이미 올라갔고, 409 라면 남이 올려놓았다.
       * 이 API 에는 `overwrite` 가 없어 **재조회 말고는 빠져나올 길이 없다.**
       */
      setIsStale(true);

      const reason =
        caught instanceof ApiError && caught.status === 409
          ? '다른 사람이 먼저 순서를 바꿨습니다.'
          : messageOf(caught, '순서를 저장하지 못했습니다.');
      const partial = hasSavedStageOrder
        ? ' 단계 순서는 저장됐고 스텝 순서만 반영되지 않았습니다.'
        : '';

      setError(`${reason}${partial} 최신 순서를 다시 불러온 뒤 조정해주세요.`);
    } finally {
      setIsSaving(false);
    }
  }

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSaving) onClose();
  }

  return (
    <>
      <PanelModal title="단계 관리" onClose={requestClose}>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {realStages.length === 0 && buckets[0].steps.length === 0 ? (
            <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
              등록된 단계가 없습니다. 아래에서 첫 단계를 추가해주세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {buckets.map((bucket, bucketIndex) => {
                const { stage } = bucket;
                const isDraggingThisStage =
                  dragging?.type === 'stage' && dragging.index === bucketIndex;

                const bucketKey = `stage:${stage?.stageId ?? 'unassigned'}`;

                return (
                  <li
                    key={bucketKey}
                    ref={slide.register(bucketKey)}
                    className={`overflow-hidden rounded-lg border ${
                      isDraggingThisStage
                        ? 'border-border-primary opacity-50'
                        : 'border-border-default'
                    }`}
                  >
                    <div
                      draggable={stage !== null && !isSaving && !isStale}
                      onDragStart={() =>
                        setDragging({ type: 'stage', index: bucketIndex })
                      }
                      onDragEnd={() => setDragging(null)}
                      onDragOver={(event) => {
                        // preventDefault 를 해야 드롭이 열린다
                        if (dragging) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!dragging) return;

                        if (dragging.type === 'stage') {
                          if (stage) moveStage(dragging.index, bucketIndex);
                        } else {
                          // 머리에 떨어뜨리면 그 묶음의 맨 앞으로
                          moveStep(dragging, { bucketIndex, index: 0 });
                        }
                        setDragging(null);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-2 ${
                        stage
                          ? 'cursor-grab bg-bg-surface active:cursor-grabbing'
                          : 'bg-bg-hover'
                      }`}
                    >
                      {stage ? (
                        <GripIcon />
                      ) : (
                        <span aria-hidden className="size-3 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-detail font-semibold text-text-primary">
                        {stage?.name ?? '미분류 (단계 없음)'}
                      </span>
                      <span className="shrink-0 text-caption text-text-secondary">
                        스텝 {bucket.steps.length}
                      </span>

                      {stage && (
                        <>
                          <MoveButtons
                            label={stage.name}
                            disabled={isSaving || isStale}
                            canMoveUp={bucketIndex > 0}
                            canMoveDown={bucketIndex < realStages.length - 1}
                            onUp={() => moveStage(bucketIndex, bucketIndex - 1)}
                            onDown={() =>
                              moveStage(bucketIndex, bucketIndex + 1)
                            }
                          />
                          <button
                            type="button"
                            disabled={isDirty || isSaving}
                            onClick={() =>
                              action.open({ kind: 'rename', stage })
                            }
                            className="shrink-0 cursor-pointer rounded-button-sm px-1.5 py-0.5 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:text-text-muted"
                          >
                            이름
                          </button>
                          <button
                            type="button"
                            disabled={isDirty || isSaving}
                            onClick={() =>
                              action.open({ kind: 'delete', stage })
                            }
                            className="shrink-0 cursor-pointer rounded-button-sm px-1.5 py-0.5 text-caption font-medium text-text-danger hover:bg-red-bg-soft disabled:cursor-not-allowed disabled:text-text-muted"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>

                    <ul
                      onDragOver={(event) => {
                        if (dragging?.type === 'step') event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (dragging?.type !== 'step') return;
                        // 빈 자리에 떨어뜨리면 맨 뒤로
                        moveStep(dragging, {
                          bucketIndex,
                          index: bucket.steps.length,
                        });
                        setDragging(null);
                      }}
                      className="min-h-8 divide-y divide-border-default border-t border-border-default"
                    >
                      {bucket.steps.length === 0 ? (
                        <li className="px-3 py-2 text-caption text-text-muted">
                          스텝을 여기로 끌어 놓을 수 있습니다.
                        </li>
                      ) : (
                        bucket.steps.map((step, index) => {
                          const isDraggingThisStep =
                            dragging?.type === 'step' &&
                            dragging.bucketIndex === bucketIndex &&
                            dragging.index === index;

                          return (
                            <li
                              key={step.stepId}
                              ref={slide.register(`step:${step.stepId}`)}
                              draggable={!isSaving && !isStale}
                              onDragStart={() =>
                                setDragging({
                                  type: 'step',
                                  bucketIndex,
                                  index,
                                })
                              }
                              onDragEnd={() => setDragging(null)}
                              onDragOver={(event) => {
                                if (dragging?.type === 'step')
                                  event.preventDefault();
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (dragging?.type !== 'step') return;
                                moveStep(dragging, { bucketIndex, index });
                                setDragging(null);
                              }}
                              className={`flex cursor-grab items-center gap-1.5 bg-bg-card px-3 py-1.5 active:cursor-grabbing ${
                                isDraggingThisStep ? 'opacity-50' : ''
                              }`}
                            >
                              <GripIcon />
                              <span className="min-w-0 flex-1 truncate text-caption text-text-primary">
                                {step.name}
                              </span>
                              {/*
                                묶음 끝에서 한 번 더 누르면 이웃 묶음으로 넘어가므로,
                                **보드 전체의 처음 · 마지막**에서만 막는다
                              */}
                              <MoveButtons
                                label={step.name}
                                disabled={isSaving || isStale}
                                canMoveUp={bucketIndex > 0 || index > 0}
                                canMoveDown={
                                  bucketIndex < buckets.length - 1 ||
                                  index < bucket.steps.length - 1
                                }
                                onUp={() => moveStepBy(bucketIndex, index, -1)}
                                onDown={() => moveStepBy(bucketIndex, index, 1)}
                              />
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-2 text-caption leading-relaxed break-keep text-text-secondary">
            행을 끌어 순서를 바꾸고 <strong>순서 저장</strong>을 누르면
            반영됩니다. 스텝은 다른 단계로도 옮길 수 있습니다. 추가한 단계는
            목록 맨 뒤에 붙습니다.
          </p>
          {isDirty && (
            <p className="mt-1 text-caption break-keep text-yellow-text">
              저장하지 않은 순서 변경이 있어 이름 수정 · 삭제는 잠시 막아
              두었습니다.
            </p>
          )}

          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
          <p
            role="alert"
            className="mt-2 text-caption break-keep text-text-danger empty:hidden"
          >
            {error}
          </p>
        </div>

        <ModalFooter>
          <button
            type="button"
            disabled={isDirty || isSaving}
            onClick={() => action.open({ kind: 'create' })}
            className="mr-auto cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-muted"
          >
            + 단계 추가
          </button>
          {isDirty && !isStale && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                // 한꺼번에 제자리로 돌아가는 것도 눈으로 따라갈 수 있어야 한다
                slide.capture();
                setBuckets(baseline);
                setError('');
              }}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
            >
              되돌리기
            </button>
          )}
          {/*
            저장이 어긋난 뒤에는 **재조회가 유일한 출구다** — 순서 API 에는 `overwrite` 가 없다.
            그래서 이때만 확인 버튼을 `다시 불러오기` 로 바꿔 다른 길을 주지 않는다.
          */}
          <button
            type="button"
            onClick={isStale ? onChanged : isDirty ? saveOrder : onClose}
            disabled={isSaving}
            className="min-w-[104px] cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
          >
            {isSaving
              ? '저장 중…'
              : isStale
                ? '다시 불러오기'
                : isDirty
                  ? '순서 저장'
                  : '닫기'}
          </button>
        </ModalFooter>
      </PanelModal>

      {/*
        하위 모달이 닫혀도 이 목록은 열린 채로 둔다 — 여러 단계를 잇달아 고치는 화면이라
        한 건 고칠 때마다 처음부터 다시 들어가게 하면 안 된다.
      */}
      {(action.target?.kind === 'create' ||
        action.target?.kind === 'rename') && (
        <StageFormModal
          projectId={projectId}
          stage={
            action.target.kind === 'rename' ? action.target.stage : undefined
          }
          onClose={action.close}
          onSaved={onChanged}
        />
      )}
      {action.target?.kind === 'delete' && (
        <StageDeleteModal
          stage={action.target.stage}
          stages={realStages}
          onClose={action.close}
          onDeleted={onChanged}
        />
      )}
    </>
  );
}

/** 끌지 못하는 환경(키보드 · 터치)에서도 순서를 바꿀 수 있게 둔다 */
/**
 * 끌지 못하는 환경(키보드 · 터치)에서도 순서를 바꿀 수 있게 둔다.
 *
 * ⚠️ 위/아래 **각각** 막을 수 있어야 한다 — 첫 줄에서 `위로` 를 눌러 아무 일도 없으면
 *    키보드 · 스크린리더 사용자는 조작이 실패한 것으로 읽는다.
 */
function MoveButtons({
  label,
  disabled,
  canMoveUp = true,
  canMoveDown = true,
  onUp,
  onDown,
}: {
  label: string;
  disabled: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`${label} 위로`}
        disabled={disabled || !canMoveUp}
        onClick={onUp}
        className="flex size-5 cursor-pointer items-center justify-center rounded-button-sm text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
      >
        <ChevronIcon direction="up" />
      </button>
      <button
        type="button"
        aria-label={`${label} 아래로`}
        disabled={disabled || !canMoveDown}
        onClick={onDown}
        className="flex size-5 cursor-pointer items-center justify-center rounded-button-sm text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
      >
        <ChevronIcon direction="down" />
      </button>
    </span>
  );
}

function GripIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="size-3 shrink-0 text-text-muted"
    >
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5"
    >
      <path d={direction === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
    </svg>
  );
}
