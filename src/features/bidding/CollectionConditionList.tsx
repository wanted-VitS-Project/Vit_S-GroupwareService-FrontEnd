'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { ErrorStateTwoButton } from '@/components/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { ApiError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import {
  getCollectionConditions,
  getCollectionRun,
  runCollection,
  toUpdateRequest,
  updateCollectionCondition,
} from './api';
import {
  formatSchedule,
  isRunning,
  RUN_STATUS_CLASS,
  RUN_STATUS_LABELS,
  summarizeRun,
} from './collectionDisplay';
import CollectionConditionFormModal, {
  type ConditionFormTarget,
} from './CollectionConditionFormModal';
import { formatAmountShort, orDash } from './display';
import { AlertBanner } from './FormFields';
import { BIDDING_CODES } from './errorCodes';
import { regionName } from './regions';
import { BIDDING_ROUTES } from './routes';
import type { CollectionCondition, CollectionRun } from './types';

/** 폴링 주기. 실측 실행이 6초쯤 걸려 2초면 3~4번에 끝난다 */
const POLL_MS = 2000;
/**
 * 폴링 상한(횟수). 넘기면 손을 놓는다 — 이력 목록 API 가 없어 되살릴 수 없다.
 * 시계(`Date.now()`) 대신 횟수로 센다 (렌더 순수성 규칙 · 결과가 재현 가능하다).
 */
const MAX_POLLS = 45;

/** 실행 중 · 결과를 조건별로 들고 있는다 — 여러 조건을 연달아 돌릴 수 있다 */
interface RunState {
  runId: number | null;
  run: CollectionRun | null;
  /** 요청 자체가 막힌 경우 (비활성 · 이미 진행 중 · 폴링 시간 초과) */
  notice: string | null;
  isBusy: boolean;
}

/** 활성 여부 보기 */
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const ACTIVE_FILTERS: { value: ActiveFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
];

const EMPTY_RUN: RunState = {
  runId: null,
  run: null,
  notice: null,
  isBusy: false,
};

/**
 * 입찰 수집 조건 관리 화면. (입찰 `EDITOR`, .ai/API.md 입찰 도메인 공통 `수집 조건`)
 *
 * 무엇을 가져올지 정하고, 수동으로 돌려 결과를 확인하는 운영 화면이다.
 *
 * ⚠️ **실행 이력 목록 API 가 없다.** 그래서 이력을 따로 화면으로 만들지 않고
 *    조건 행에 붙인다 — 방금 돌린 결과만 보이고, 화면을 떠나면 `runId` 를 잃는다.
 *    다시 들어오면 조건의 `마지막 성공` · `수집 건수` 만 남는다.
 */
export default function CollectionConditionList() {
  const [conditions, setConditions] = useState<CollectionCondition[] | null>(
    null,
  );
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  /** 조건 ID → 실행 상태 */
  const [runs, setRuns] = useState<Record<number, RunState>>({});
  /**
   * 폴링 뒷정리 — 대기 중인 타이머와 **이미 나간 요청**을 함께 끊는다.
   * 타이머만 끊으면 응답이 돌아와 언마운트된 컴포넌트에 `setState` 를 한다.
   */
  const timers = useRef<Set<number>>(new Set());
  const pollAbort = useRef<AbortController | null>(null);
  const formModal = useModalTarget<ConditionFormTarget>();
  /**
   * 활성 여부 변경 확인.
   * 켜고 끄는 것 모두 **수집 동작이 바뀌는 일**이라 양쪽 다 한 번 묻는다.
   */
  const toggleDialog = useModalTarget<CollectionCondition>();
  /** 활성 여부 보기 — 조건 목록 API 에 필터가 없어 받아온 뒤 화면에서 거른다 */
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  /** 토글 진행 중인 조건 — 연타로 요청이 겹치지 않게 막는다 */
  const [togglingId, setTogglingId] = useState<number | null>(null);
  /**
   * 토글 실패 메시지 — **조건별**로 들고 있는다.
   * 화면 위쪽에 하나만 띄우면 어느 조건에서 난 오류인지 알 수 없고, 다음 동작에도 남는다.
   */
  const [toggleErrors, setToggleErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCollectionConditions(signal)
      .then((data) => setConditions(data.content))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [reloadCount]);

  useEffect(() => {
    const controller = new AbortController();
    pollAbort.current = controller;
    const pending = timers.current;

    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
      controller.abort();
    };
  }, []);

  function patchRun(conditionId: number, patch: Partial<RunState>) {
    setRuns((prev) => ({
      ...prev,
      [conditionId]: { ...EMPTY_RUN, ...prev[conditionId], ...patch },
    }));
  }

  /** `COMPLETED` · `FAILED` 가 될 때까지 물어본다. 상한을 넘기면 안내만 남기고 멈춘다 */
  function poll(conditionId: number, runId: number, attempt: number) {
    const timer = window.setTimeout(async () => {
      // 끝난 타이머는 목록에서 뺀다 — 안 그러면 실행할수록 배열만 길어진다
      timers.current.delete(timer);

      try {
        const run = await getCollectionRun(runId, pollAbort.current?.signal);
        patchRun(conditionId, { run });

        if (!isRunning(run.runStatus)) {
          patchRun(conditionId, { isBusy: false });
          // 새 공고가 들어왔을 수 있으니 조건의 마지막 성공 시각도 갱신한다
          setReloadCount((count) => count + 1);
          return;
        }

        if (attempt >= MAX_POLLS) {
          patchRun(conditionId, {
            isBusy: false,
            notice:
              '수집이 아직 끝나지 않았어요. 잠시 후 목록을 새로고침해 결과를 확인해주세요.',
          });
          return;
        }

        poll(conditionId, runId, attempt + 1);
      } catch (error) {
        // 언마운트로 인한 취소는 실패가 아니다 (알릴 화면도 이미 없다)
        if (pollAbort.current?.signal.aborted) return;

        patchRun(conditionId, {
          isBusy: false,
          notice: messageOf(error, '수집 결과를 가져오지 못했어요.'),
        });
      }
    }, POLL_MS);

    timers.current.add(timer);
  }

  async function startRun(condition: CollectionCondition) {
    patchRun(condition.conditionId, {
      isBusy: true,
      notice: null,
      run: null,
      runId: null,
    });

    try {
      const accepted = await runCollection(condition.conditionId);

      patchRun(condition.conditionId, { runId: accepted.runId });
      poll(condition.conditionId, accepted.runId, 1);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;

      // 409 는 오류가 아니라 "이미 돌고 있다" 는 뜻이다
      const notice =
        code === BIDDING_CODES.collectionRunAlreadyProcessing
          ? '이미 수집이 진행 중이에요. 끝난 뒤에 다시 시도해주세요.'
          : code === BIDDING_CODES.inactiveCollectionCondition
            ? '비활성 조건은 수집할 수 없어요. 조건을 활성화한 뒤 다시 시도해주세요.'
            : messageOf(error, '수집 요청에 실패했어요.');

      patchRun(condition.conditionId, { isBusy: false, notice });
    }
  }

  /**
   * 활성 여부만 바꾼다. 수정이 전체 교체라 조회값을 그대로 실어 보내고 `isActive` 만 갈아끼운다.
   * 성공하면 목록을 다시 받아 서버 값과 어긋나지 않게 한다.
   */
  async function toggleActive(condition: CollectionCondition) {
    const { conditionId } = condition;

    setTogglingId(conditionId);
    // 다시 시도할 때 지난 실패 문구가 남아 있으면 방금 또 실패한 것처럼 보인다
    clearToggleError(conditionId);

    const nextActive = !condition.isActive;

    try {
      await updateCollectionCondition(conditionId, {
        ...toUpdateRequest(condition),
        isActive: nextActive,
        /**
         * ⚠️ 비활성으로 내릴 때는 **자동 수집도 함께 끈다.**
         * 비활성 조건에 스케줄이 살아 있는 건 모순이라 서버가 400
         * (`자동 수집 일정이 올바르지 않습니다`) 으로 막는다.
         * 다시 활성화해도 자동 수집은 꺼진 채로 남으므로, 필요하면 수정 모달에서 켠다.
         */
        ...(nextActive
          ? null
          : {
              autoCollectionEnabled: false,
              scheduleType: null,
              scheduledTime: null,
              timezone: null,
            }),
      });
      setReloadCount((count) => count + 1);
    } catch (error) {
      setToggleErrors((prev) => ({
        ...prev,
        [conditionId]: messageOf(error, '활성 여부를 바꾸지 못했어요.'),
      }));
    } finally {
      setTogglingId(null);
    }
  }

  function clearToggleError(conditionId: number) {
    setToggleErrors((prev) => {
      if (prev[conditionId] === undefined) return prev;

      const next = { ...prev };
      delete next[conditionId];
      return next;
    });
  }

  const visible =
    conditions === null
      ? null
      : conditions.filter((condition) =>
          activeFilter === 'ALL'
            ? true
            : condition.isActive === (activeFilter === 'ACTIVE'),
        );

  return (
    <>
      <p className="text-caption text-text-secondary">
        <Link
          href={BIDDING_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          입찰 공고
        </Link>
        {' › 수집 조건'}
      </p>

      {/* 액션 버튼은 공고 조회와 같은 자리(필터 줄 오른쪽 끝)에 둔다 — 화면을 옮겨도 안 튄다 */}
      <div className="mb-6">
        <h2 className="text-heading-m font-bold">수집 조건</h2>
        <p className="mt-1.5 text-caption break-keep text-text-secondary">
          어떤 공고를 가져올지 정하고, 필요할 때 직접 수집을 돌립니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {/* 조건 수가 적어 셀렉트 대신 칩으로 둔다 (API 에 필터 파라미터가 없어 화면에서 거른다) */}
        {conditions !== null &&
          conditions.length > 0 &&
          ACTIVE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              aria-pressed={activeFilter === option.value}
              className={`tag cursor-pointer ${
                activeFilter === option.value
                  ? 'tag-blue'
                  : 'tag-gray hover:bg-bg-hover'
              }`}
            >
              {option.label}
            </button>
          ))}

        <button
          type="button"
          onClick={() => formModal.open('create')}
          className="btn btn-sm btn-primary ml-auto shrink-0"
        >
          조건 등록
        </button>
      </div>

      {hasFailed ? (
        <ErrorStateTwoButton
          title="수집 조건을 불러오지 못했어요."
          description="잠시 후 다시 시도해주세요."
          onRetry={() => {
            setHasFailed(false);
            setReloadCount((count) => count + 1);
          }}
        />
      ) : conditions === null ? (
        <SkeletonGroup label="수집 조건을 불러오는 중" className="space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </SkeletonGroup>
      ) : conditions.length === 0 ? (
        <EmptyState />
      ) : visible?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default bg-bg-card px-6 py-12 text-center">
          <p className="text-caption text-text-secondary">
            해당하는 조건이 없어요.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-10">
          {visible?.map((condition) => (
            <ConditionCard
              key={condition.conditionId}
              condition={condition}
              state={runs[condition.conditionId]}
              isToggling={togglingId === condition.conditionId}
              toggleError={toggleErrors[condition.conditionId]}
              onRun={() => startRun(condition)}
              onEdit={() => formModal.open(condition)}
              onToggleActive={() => toggleDialog.open(condition)}
              onDismissToggleError={() =>
                clearToggleError(condition.conditionId)
              }
            />
          ))}
        </div>
      )}

      {toggleDialog.target && (
        <ToggleConfirmDialog
          condition={toggleDialog.target}
          onConfirm={() => {
            const target = toggleDialog.target;
            toggleDialog.close();
            if (target) toggleActive(target);
          }}
          onCancel={toggleDialog.close}
        />
      )}

      {formModal.target && (
        <CollectionConditionFormModal
          target={formModal.target}
          onClose={formModal.close}
          onSaved={() => {
            formModal.close();
            setReloadCount((count) => count + 1);
          }}
        />
      )}
    </>
  );
}

/**
 * 활성 여부 확인 다이얼로그.
 *
 * 끄는 쪽은 잃는 것(자동 수집)이 있어 위험 색으로, 켜는 쪽은 되돌리기 쉬워 안내 색으로 묻는다.
 */
function ToggleConfirmDialog({
  condition,
  onConfirm,
  onCancel,
}: {
  condition: CollectionCondition;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (condition.isActive) {
    return (
      <AlertDialogTwoButton
        icon={DialogIcons.warning}
        title="이 조건을 비활성화할까요?"
        description={
          condition.autoCollectionEnabled
            ? '비활성 조건은 수동 수집도 할 수 없고, 켜져 있던 자동 수집도 함께 꺼집니다. 다시 활성화해도 자동 수집은 꺼진 채로 남습니다.'
            : '비활성 조건은 수동 수집도 할 수 없습니다. 언제든 다시 활성화할 수 있습니다.'
        }
        confirmLabel="비활성화"
        isDanger
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  return (
    <AlertDialogTwoButton
      icon={DialogIcons.info}
      title="이 조건을 활성화할까요?"
      description="활성화하면 지금 수집을 돌릴 수 있습니다. 자동 수집은 꺼진 상태이며, 필요하면 수정에서 켜주세요."
      confirmLabel="활성화"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/** 조건이 없으면 수동 수집을 **시작할 수 없다** — 등록으로 유도한다 */
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border-default bg-bg-card px-6 py-12 text-center">
      <p className="text-label font-bold text-text-primary">
        등록된 수집 조건이 없어요.
      </p>
      <p className="mt-1.5 text-caption break-keep text-text-secondary">
        조건을 먼저 등록해야 공고를 가져올 수 있어요.
      </p>
    </div>
  );
}

function ConditionCard({
  condition,
  state,
  isToggling,
  toggleError,
  onRun,
  onEdit,
  onToggleActive,
  onDismissToggleError,
}: {
  condition: CollectionCondition;
  state?: RunState;
  isToggling: boolean;
  toggleError?: string;
  onRun: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDismissToggleError: () => void;
}) {
  const {
    conditionName,
    sourceName,
    sourceCode,
    noticeTypes,
    filters,
    isActive,
    autoCollectionEnabled,
    scheduleType,
    scheduledTime,
    lastSuccessAt,
    lastCollectedCount,
  } = condition;

  const isBusy = state?.isBusy ?? false;

  return (
    <section className="rounded-xl border border-border-default bg-bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-label font-bold text-text-primary">
              {conditionName}
            </h3>
            <Badge
              label={isActive ? '활성' : '비활성'}
              className={isActive ? 'badge-blue' : 'badge-gray'}
            />
            {autoCollectionEnabled && (
              <Badge
                label={`자동 · ${formatSchedule(scheduleType, scheduledTime)}`}
                className="badge-purple"
              />
            )}
          </div>

          <p className="mt-1 text-detail text-text-secondary">
            {orDash(sourceName ?? sourceCode)}
            {noticeTypes.length > 0 && ` · ${noticeTypes.join(' · ')}`}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="btn btn-sm btn-gray"
          >
            수정
          </button>
          {/**
           * 활성 여부는 배지가 아니라 **버튼**으로 바꾼다 — 배지처럼 생기면 누를 수 있는지 모른다.
           * ⚠️ 수정이 전체 교체라 이 값만 보낼 수 없다 (`toUpdateRequest()` 가 나머지를 함께 싣는다).
           */}
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isToggling}
            className="btn btn-sm btn-gray"
          >
            {isToggling ? '변경 중…' : isActive ? '비활성화' : '활성화'}
          </button>
          <button
            type="button"
            onClick={onRun}
            // 비활성 조건은 400 이 확정이라 누르기 전에 막는다
            disabled={!isActive || isBusy}
            title={isActive ? undefined : '비활성 조건은 수집할 수 없습니다'}
            className="btn btn-sm btn-primary"
          >
            {isBusy ? '수집 중…' : '지금 수집'}
          </button>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-detail sm:grid-cols-2">
        <Row label="키워드" value={joinOrDash(filters.keywords)} />
        {/* 코드(`11`)가 아니라 이름(`서울`)으로 보여준다 */}
        <Row
          label="지역"
          value={joinOrDash(filters.regionCodes.map(regionName))}
        />
        <Row label="사업 카테고리" value={joinOrDash(filters.industryCodes)} />
        <Row
          label="추정가격"
          value={formatPriceRange(
            filters.minimumEstimatedPrice,
            filters.maximumEstimatedPrice,
          )}
        />
        <Row
          label="마감 건 제외"
          value={filters.excludeClosed ? '제외' : '포함'}
        />
        <Row
          label="마지막 수집 성공"
          value={
            lastSuccessAt
              ? `${formatDateTime(lastSuccessAt)} · ${lastCollectedCount ?? 0}건`
              : '없음'
          }
        />
      </dl>

      {toggleError && (
        <AlertBanner tone="danger" className="mt-4 flex items-start gap-3">
          <span className="flex-1">{toggleError}</span>
          <button
            type="button"
            onClick={onDismissToggleError}
            aria-label="닫기"
            className="cursor-pointer font-bold"
          >
            ✕
          </button>
        </AlertBanner>
      )}

      {state && <RunResult state={state} />}
    </section>
  );
}

/** 방금 돌린 결과. 화면을 떠나면 사라진다 (이력 목록 API 부재) */
function RunResult({ state }: { state: RunState }) {
  if (state.notice) {
    return (
      <AlertBanner tone="warning" className="mt-4">
        {state.notice}
      </AlertBanner>
    );
  }

  const { run } = state;
  if (!run) return null;

  const failed = run.runStatus === 'FAILED';

  return (
    <div className="mt-4 rounded-lg border border-border-default bg-bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge
          label={RUN_STATUS_LABELS[run.runStatus]}
          className={RUN_STATUS_CLASS[run.runStatus]}
        />
        <span className="text-caption text-text-secondary">
          실행 #{run.runId} · {formatDateTime(run.startedAt)}
        </span>
      </div>

      {isRunning(run.runStatus) ? (
        <p className="mt-2 text-detail text-text-secondary">
          수집이 끝나면 결과가 여기에 표시돼요.
        </p>
      ) : failed ? (
        <p className="mt-2 text-detail break-keep text-text-danger">
          {orDash(run.errorMessage)}
        </p>
      ) : (
        <>
          <p className="mt-2 text-detail text-text-primary">
            {summarizeRun(run.collectedCount, run.insertedCount)}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-secondary">
            <Count label="전체" value={run.collectedCount} />
            <Count label="신규" value={run.insertedCount} />
            <Count label="갱신" value={run.updatedCount} />
            <Count label="건너뜀" value={run.skippedCount} />
          </dl>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 break-keep text-text-primary">{value}</dd>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-1">
      <dt>{label}</dt>
      <dd className="font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

/** 공용 `.badge` + 색 클래스(`badge-blue` 등)만 조합한다 */
function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`badge shrink-0 ${className}`}>{label}</span>;
}

/** 빈 배열은 `제한 없음` 이다 — `-` 로 두면 값을 못 불러온 것처럼 읽힌다 */
function joinOrDash(values: string[]) {
  return values.length > 0 ? values.join(', ') : '제한 없음';
}

function formatPriceRange(min: number | null, max: number | null) {
  if (min === null && max === null) return '제한 없음';
  if (min !== null && max === null) return `${formatAmountShort(min)} 이상`;
  if (min === null && max !== null) return `${formatAmountShort(max)} 이하`;

  return `${formatAmountShort(min)} ~ ${formatAmountShort(max)}`;
}
