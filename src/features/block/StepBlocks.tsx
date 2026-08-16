'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ErrorStateTwoButton } from '@/components/ErrorState';
import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { notifyToast } from '@/components/Toast';
import {
  useRefreshProjectSteps,
  useStepName,
} from '@/features/project/useProjectSteps';
import { useModalRouter } from '@/lib/useModal';

import AddBlockButton from './AddBlockButton';
import ArrangeBlocksButton from './ArrangeBlocksButton';
import BlockBoard, { type ArrangeHandle } from './BlockBoard';
import { BlockBoardSkeleton } from './BlockSkeletons';
import { BLOCK_CHANGED_EVENT } from './events';
import RefreshBlocksButton from './RefreshBlocksButton';
import {
  useRefreshStepBlocks,
  useSetStepBlocks,
  useStepBlocks,
} from './useStepBlocks';

/** 새로고침 아이콘이 최소한 이만큼은 돈다 — 눌렸다는 사실이 보이도록 */
const MIN_SPIN_MS = 500;

const BlockArrangeExitModal = dynamic(() => import('./BlockArrangeExitModal'), {
  loading: () => <ModalLoadingFallback title="배치 저장" />,
});
const BlockArrangeBlockedModal = dynamic(
  () => import('./BlockArrangeBlockedModal'),
  { loading: () => <ModalLoadingFallback title="배치 편집 중" /> },
);

/**
 * 스텝 화면의 블록 영역 — 목록 조회 · 재조회 · 헤더를 함께 관리한다.
 * 블록을 추가하면 목록을 다시 불러온다.
 */
export default function StepBlocks() {
  const params = useParams<{ id: string; stepId: string }>();
  const projectId = params.id;
  const stepId = params.stepId;

  /**
   * 블록 목록 — 캐시는 스텝별로 나뉘어 있어(`['step-blocks', stepId]`)
   * 경로가 바뀌면 남의 스텝 응답이 섞일 자리가 없다.
   */
  const { data: blocks, isError, refetch } = useStepBlocks(stepId);
  /** 캐시를 버리고 다시 읽는다 — 블록 영역만 */
  const refresh = useRefreshStepBlocks(stepId);
  /** 서버에 다녀오지 않고 캐시만 갈아끼운다 (드래그로 바뀐 순서) */
  const setBlocks = useSetStepBlocks(stepId);

  /**
   * 헤더에 세울 스텝 이름. 목록 캐시에서 이름 한 줄만 꺼내 온다.
   * 스텝을 고치면 사이드바가 무효화하고, 새로고침 버튼도 함께 다시 읽는다.
   */
  const stepName = useStepName(projectId, stepId);
  const refreshSteps = useRefreshProjectSteps(projectId);
  /** 생성 직후 입력창을 띄울 블록 */
  const [autoEditBlockId, setAutoEditBlockId] = useState<number | null>(null);
  /**
   * 생성 직전의 블록 ID 목록 스냅샷.
   * 블록 생성 응답에 ID 가 없어(스키마 미확정) 재조회 결과와 비교해 새 블록을 찾는다.
   *
   * ⚠️ 어느 스텝의 목록인지 함께 담는다. `stepId` 없이 비교하면
   *    스텝을 옮긴 뒤 도착한 응답에서 남의 블록을 신규로 오판할 수 있다.
   */
  const snapshotBeforeCreate = useRef<{
    stepId: string;
    ids: number[];
  } | null>(null);
  /**
   * 보드가 넘겨준 "대기 중인 배치를 지금 보내기" 손잡이.
   *
   * 블록 생성 직전에 부른다. 미뤄둔 배치 저장이 생성 **뒤에** 나가면
   * 새 블록이 빠진 목록을 스텝 전체 배치로 보내게 된다.
   */
  const flushLayout = useRef<(() => void) | null>(null);
  /** 배치 편집 모드 — 이때만 블록을 끌어 옮길 수 있다 */
  const [isArranging, setIsArranging] = useState(false);
  /**
   * 새로고침 버튼이 도는 중.
   *
   * `isFetching` 을 쓰지 않는다 — 화면 복귀 · 블록 생성처럼 **사용자가 부르지 않은**
   * 재조회까지 아이콘이 도는 것은 설명되지 않는 움직임이다.
   */
  const [isRefreshing, setIsRefreshing] = useState(false);
  /**
   * 블록 본문 세대. 새로고침이 성공할 때만 올라간다.
   *
   * 목록을 새로 받아도 본문은 따라오지 않는다 — 유형마다 `detail` 을 첫 렌더에
   * 베껴 두거나(체크리스트 · 이미지 · 결재 · AI) 자기 API 를 따로 부르기(문서 · 결재 · AI)
   * 때문이다. 세대를 올려 본문만 다시 마운트하면 열 유형이 한꺼번에 서버 값으로 돌아온다.
   */
  const [bodyGeneration, setBodyGeneration] = useState(0);
  /**
   * 배치 편집이 띄우는 두 모달. 둘은 **동시에 뜰 수 없다** —
   * `저장할까요?` 는 편집을 끝낼 때, `추가할 수 없습니다` 는 편집 중에만 나온다.
   */
  const arrangeModal = useModalRouter<'exit' | 'blocked'>();
  /** 보드가 넘겨준 배치 편집 손잡이 */
  const arrange = useRef<ArrangeHandle | null>(null);

  /**
   * 편집 모드를 끄려는 순간.
   * **바뀐 게 없으면 묻지도, 보내지도 않는다** — 편집만 켰다 껐거나 제자리로 돌려놓은 경우다.
   */
  function toggleArrange() {
    if (!isArranging) {
      setIsArranging(true);
      return;
    }

    if (arrange.current?.hasChanges()) {
      arrangeModal.open('exit');
      return;
    }
    setIsArranging(false);
  }

  /**
   * 새로고침 버튼을 누른 순간.
   *
   * ⚠️ **미뤄둔 배치를 먼저 보낸다.** 새 목록이 도착하면 보드가 로컬 순서를 버리고
   *    `saver.reset()` 으로 대기 중인 배치까지 지운다 — 방금 끈 블록이 조용히 사라진다.
   *    (화면을 떠날 때 · 블록을 만들 때와 같은 방침)
   *
   * 최소 회전 시간을 두는 이유는 눈속임이 아니다. 응답이 100ms 안에 오면 아이콘이
   * **깜빡이지도 않고** 끝나 "눌리지 않았다" 로 읽힌다. 바뀐 게 없을 때는 화면도
   * 그대로라 구별할 단서가 아예 없어진다 — 그래서 토스트로 결과도 알린다.
   */
  async function handleRefresh() {
    flushLayout.current?.();
    setIsRefreshing(true);

    try {
      const [result] = await Promise.all([
        refetch(),
        // 헤더의 스텝 이름도 같이 맞춘다 — 남이 이름을 바꿨을 수 있다
        refreshSteps(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS)),
      ]);
      // 실패하면 오류 화면이 대신 말한다 — 토스트까지 겹치면 같은 말을 두 번 한다
      if (result.isError) return;

      // 방금 만든 블록의 편집창을 다시 열지 않는다 — 본문을 새로 마운트하기 때문
      setAutoEditBlockId(null);
      setBodyGeneration((generation) => generation + 1);
      notifyToast('블록을 새로 불러왔습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }

  /**
   * 새로 받은 목록에서 방금 만든 블록을 찾아 편집창을 띄운다.
   *
   * 목록이 실제로 **달라졌을 때만** 실행된다 — react-query 가 구조 공유로
   * 내용이 같은 응답에는 같은 참조를 돌려주기 때문이다.
   */
  useEffect(() => {
    if (!blocks) return;

    const before = snapshotBeforeCreate.current;
    snapshotBeforeCreate.current = null;
    // 다른 스텝에서 찍은 스냅샷이면 비교 자체가 무의미하다
    if (!before || before.stepId !== stepId) return;

    // 만들자마자 내용을 채워야 하는 유형만 자동으로 띄운다
    // (TEXT — 본문 편집기 · IMAGE — 이미지 등록 모달)
    const created = blocks.find(
      (block) =>
        (block.type === 'TEXT' || block.type === 'IMAGE') &&
        !before.ids.includes(block.blockId),
    );
    if (created) setAutoEditBlockId(created.blockId);
  }, [blocks, stepId]);

  useEffect(() => {
    window.addEventListener(BLOCK_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(BLOCK_CHANGED_EVENT, refresh);
  }, [refresh]);

  /**
   * 다른 사람이 바꾼 배치를 받아오는 지점.
   *
   * 서버가 변경을 밀어주는 통로(WebSocket · SSE)가 없어 **실시간 반영은 불가능**하다.
   * 대신 화면으로 **돌아오는 순간** 다시 읽는다 — 자리를 비운 사이의 변경이 가장 크고,
   * 보고 있지 않은 동안 주기적으로 찔러 보는 것보다 요청도 적다.
   *
   * 나가기 직전에는 미뤄둔 배치를 먼저 보낸다. 그러지 않으면 탭을 옮기는 순간
   * 마지막 이동이 대기 상태로 남고, 돌아와 재조회하면 그대로 사라진다.
   */
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        flushLayout.current?.();
        return;
      }
      refresh();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <RefreshBlocksButton
            isRefreshing={isRefreshing}
            isDisabled={isArranging}
            onRefresh={() => {
              void handleRefresh();
            }}
          />
          <h2 className="min-w-0 truncate text-body-m font-semibold text-text-primary">
            {stepName || '스텝'}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ArrangeBlocksButton
            isArranging={isArranging}
            isDisabled={blocks === undefined || blocks.length === 0}
            onToggle={toggleArrange}
          />
          <AddBlockButton
            stepName={stepName || '스텝'}
            blocks={blocks ?? null}
            isBlocked={isArranging}
            onBlocked={() => arrangeModal.open('blocked')}
            onBeforeCreate={() => flushLayout.current?.()}
            onCreated={() => {
              // blocks 가 null 이면 기준이 빈 배열이 되어 기존 블록까지 신규로 잡힌다.
              // 그럴 때는 스냅샷을 남기지 않고 자동 편집을 건너뛴다
              snapshotBeforeCreate.current = blocks
                ? { stepId, ids: blocks.map((block) => block.blockId) }
                : null;
              setAutoEditBlockId(null);
              refresh();
            }}
          />
        </div>
      </div>

      {isError ? (
        <ErrorStateTwoButton
          title="블록을 불러오지 못했습니다."
          description="잠시 후 다시 시도해주세요."
          retryLabel="다시 시도"
          onRetry={refresh}
          actionLabel="프로젝트로 이동"
          actionHref={`/projects/${projectId}`}
        />
      ) : !blocks ? (
        <BlockBoardSkeleton />
      ) : (
        <BlockBoard
          stepId={stepId}
          blocks={blocks}
          autoEditBlockId={autoEditBlockId}
          bodyGeneration={bodyGeneration}
          isArranging={isArranging}
          arrangeRef={arrange}
          flushLayoutRef={flushLayout}
          // 바뀐 순서를 캐시에도 반영한다 — 다음 `블록 추가` 가 옛 좌표로 자리를 잡지 않게
          onOrderChanged={setBlocks}
        />
      )}

      {arrangeModal.isOpen('exit') && (
        <BlockArrangeExitModal
          onSave={() => {
            arrange.current?.save();
            arrangeModal.close();
            setIsArranging(false);
          }}
          // 계속 편집 — 편집 모드에 그대로 남는다
          onClose={arrangeModal.close}
        />
      )}

      {arrangeModal.isOpen('blocked') && (
        <BlockArrangeBlockedModal onClose={arrangeModal.close} />
      )}
    </div>
  );
}
