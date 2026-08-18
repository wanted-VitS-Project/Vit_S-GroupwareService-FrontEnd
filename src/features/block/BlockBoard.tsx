'use client';

// CSR - 스텝 블록 보드: 3열 grid 에 블록 카드를 늘어놓고 드래그로 배치를 바꾼다.
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import ApprovalBlock from '@/features/approval/ApprovalBlock';

import BlockCard from './BlockCard';
import {
  computeRows,
  hasSameOrder,
  moveAfter,
  moveTo,
  renumber,
  toFlatOrder,
  toSpan,
} from './blockLayout';
import { BlockActionsProvider, type BlockActions } from './BlockActionsContext';
import { BlockDragProvider, type BlockDragValue } from './BlockDragContext';
import { BlockCanEditProvider } from './BlockPermissionContext';
import {
  BlockMembersProvider,
  useBlockMembersSource,
} from './BlockMembersContext';
import {
  BLOCK_COLUMNS,
  normalizeUpdatedOwner,
  type StepBlock,
  type UpdateBlockResponse,
} from './types';
import { useDragAutoScroll } from './useDragAutoScroll';
import { useLayoutSaver } from './useLayoutSaver';
import { SLIDE_DURATION_MS, useSlideOnReorder } from './useSlideOnReorder';

/** 결재를 제외한 블록 본문은 유형별 청크로 나눈다. SSR은 유지해 첫 화면 모양이 바뀌지 않는다. */
const ChecklistBlock = dynamic(() => import('./ChecklistBlock'), {
  loading: BlockBodyFallback,
});
const TextBlock = dynamic(() => import('./TextBlock'), {
  loading: BlockBodyFallback,
});
const FileBlock = dynamic(() => import('./FileBlock'), {
  loading: BlockBodyFallback,
});
const ImageBlock = dynamic(() => import('./ImageBlock'), {
  loading: BlockBodyFallback,
});
const AiBlock = dynamic(() => import('@/features/vitamate/AiBlock'), {
  loading: BlockBodyFallback,
});
const SettlementBlock = dynamic(
  () => import('@/features/settlement/SettlementBlock'),
  { loading: BlockBodyFallback },
);

/** 클라이언트 이동에서 청크가 늦어도 grid 높이가 0으로 접히지 않게 자리를 유지한다. */
function BlockBodyFallback() {
  return (
    <div
      role="status"
      aria-label="블록을 불러오는 중입니다"
      className="min-h-32 animate-pulse rounded-lg border border-border-default bg-bg-card"
    />
  );
}

// 대상 위에 이만큼 머문 뒤에야 자리를 옮긴다.
// 빠르게 훑고 지나가는 블록마다 교환하면 이동이 연쇄돼 배치가 통째로 흐트러진다.
const HOVER_DWELL_MS = 110;

// 한 번 옮긴 뒤 자리가 잡힐 때까지 새 판정을 받지 않는다.
// 미끄러지는 도중에 판정하면 아직 움직이는 중인 블록을 기준으로 또 옮기게 된다.
const SETTLE_MS = SLIDE_DURATION_MS;

// Tailwind 가 조합된 클래스명을 못 읽으므로 완성된 문자열로 매핑한다.
// 폭 분기(md)를 보드 격자와 반드시 함께 맞춘다. 좁은 화면에서 보드가 1열이 되는데
// 여기만 col-span-2 로 남으면, 그리드가 없는 두 번째 열을 암시적으로 만들어
// 그 블록만 화면 밖으로 삐져나간다 (가로 스크롤바가 생긴다).
const COL_SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-3',
};

// 배치 편집 모드에서 헤더 쪽 버튼이 잡는 손잡이.
// 보드 밖(스텝 헤더)에 버튼이 있어 컨텍스트 대신 ref 로 넘긴다 — flushLayoutRef 와 같은 방식이다.
export interface ArrangeHandle {
  /** 편집을 시작한 시점과 순서가 달라졌는지 — 같으면 저장 요청을 아예 만들지 않는다 */
  hasChanges: () => boolean;
  /** 지금 보이는 배치를 서버로 보낸다 */
  save: () => void;
  /** 편집을 시작한 시점의 배치로 되돌린다 (요청 없음) */
  revert: () => void;
}

/** 지금 겨누고 있는 자리 */
interface DropTarget {
  blockId: number;
  /** swap — 대상과 자리 교환·after — 대상 바로 뒤 (빈 칸 안내) */
  mode: 'swap' | 'after';
}

function usedColumns(row: StepBlock[]) {
  return row.reduce((total, block) => total + toSpan(block.colSpan), 0);
}

// 커서 아래 요소에서 어느 자리를 겨누고 있는지 읽는다.
// 칸(grid item)에 남긴 data-* 를 거슬러 올라가 찾는다 — 카드 내부 구조와 무관해서
// 파일 목록·에디터처럼 자체 드래그 처리를 하는 자식 위에서도 판정이 된다.
function readDropTarget(target: EventTarget | null): DropTarget | null {
  if (!(target instanceof Element)) return null;

  const cell = target.closest('[data-drop-block],[data-drop-after]');
  if (!(cell instanceof HTMLElement)) return null;

  const after = cell.dataset.dropAfter;
  if (after !== undefined) return { blockId: Number(after), mode: 'after' };

  return { blockId: Number(cell.dataset.dropBlock), mode: 'swap' };
}

// 스텝 화면의 블록 보드.
// 가로는 3칸 고정, 세로는 제한 없이 늘어난다.
// 순서는 평면 배열 하나로 들고, 행 나누기는 3열 grid 의 자동 배치에 맡긴다 —
// "남은 칸에 안 들어가면 다음 줄, 되돌아가 채우지 않는다" 가 computeRows() 와 같은 규칙이고,
// 같은 행 높이 공유도 grid 가 해준다.
// 드래그 중에는 순서 자체를 그때그때 바꾼다 (미리보기를 따로 계산하지 않는다).
// 시작 시점 순서에서 매번 다시 계산하면, 한 번 옮긴 뒤에는 같은 블록을 다시 겨눠도
// 결과가 늘 같아서 되돌리거나 가운데로 다시 넣을 수가 없다.
// 행마다 래퍼(또는 keyed Fragment)를 두면 순서가 바뀔 때 래퍼 key 가 달라져
// 행 전체가 재마운트된다 (블록이 사라졌다 다시 그려지며 깜빡인다).
// 래퍼 없이 하나의 평평한 목록으로 내보내고 블록만 blockId 로 keying 한다.
export default function BlockBoard({
  stepId,
  canEdit = true,
  blocks,
  autoEditBlockId,
  bodyGeneration = 0,
  isArranging = false,
  arrangeRef,
  onOrderChanged,
  flushLayoutRef,
}: {
  stepId: string;
  // 이 스텝의 블록을 고칠 수 있는지 (스텝 myPermission).
  // 카드 ⋯ 의 쓰기 항목을 여닫는다 — 값은 컨텍스트로 흘러 본문 유형을 거치지 않는다.
  // 기본 true — 보드 밖·옛 호출부가 조용히 잠기지 않게 한다.
  canEdit?: boolean;
  blocks: StepBlock[];
  /** 방금 만든 블록 — 편집 입력창을 곧바로 띄운다 */
  autoEditBlockId?: number | null;
  // 값이 바뀌면 블록 본문만 다시 마운트한다 (카드 자리·드래그 배선은 그대로).
  // 새로고침 버튼이 올린다 — 자기 상태를 따로 든 본문까지 서버 값으로 되돌리려고.
  bodyGeneration?: number;
  /** 배치 편집 모드 — 이때만 블록을 끌어 옮길 수 있다 */
  isArranging?: boolean;
  /** 배치 편집 손잡이를 헤더 버튼에 넘겨준다 */
  arrangeRef?: RefObject<ArrangeHandle | null>;
  // 바뀐 순서를 목록 주인에게 돌려준다 — 놓는 즉시 한 번, 저장 응답이 오면 또 한 번.
  // 새 블록 자리 계산(nextPosition)이 옛 좌표를 보지 않게 하려면 즉시 알려야 한다.
  // 목록 주인이 캐시에 넣은 배열을 돌려주면 그걸 메아리로 잡는다 (구조 공유 대응).
  onOrderChanged?: (blocks: StepBlock[]) => StepBlock[] | void;
  /** 대기 중인 배치를 지금 보내는 손잡이를 넘겨준다 (블록 생성 직전에 쓴다) */
  flushLayoutRef?: RefObject<(() => void) | null>;
}) {
  const { id: projectId } = useParams<{ id: string }>();
  // 참여자 목록 — 담당자 퇴사 표기(카드)와 담당자 후보(수정 모달)가 함께 쓴다.
  // 여기서 한 번만 받아 컨텍스트로 내려준다 (BlockMembersContext).
  const members = useBlockMembersSource(projectId);
  const [order, setOrder] = useState(() => toFlatOrder(blocks));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  /** 커서가 올라가 있는 빈 칸 안내 — 강조 표시에만 쓴다 */
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  /** 머무름을 기다리는 중인 대상 — "지금 여기를 겨누고 있다" 를 보여준다 */
  const [aimingId, setAimingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  // 배치 편집을 시작한 시점의 순서 — 저장할지 물을 기준이자 되돌릴 자리다.
  // 편집 중 여러 번 옮겼다가 제자리로 돌아왔으면 여기와 같아져 요청이 나가지 않는다.
  // ref 가 아니라 state 다 — 안내줄의 되돌리기 노출이 이 값에 따라 달라진다.
  const [arrangeBase, setArrangeBase] = useState<StepBlock[] | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  /** 드래그를 시작할 때의 순서 — 끝나고 정말 달라졌는지 비교한다 */
  const orderBeforeDrag = useRef<StepBlock[] | null>(null);
  /** 직전에 처리한 대상. 같은 블록 위에서 이벤트가 계속 와도 반복 교환하지 않는다 */
  const lastTarget = useRef<string | null>(null);
  // order 의 최신값. dragover 로 인한 갱신은 렌더가 밀릴 수 있어,
  // drop 시점에 state 만 믿으면 한 번 늦은 순서를 저장할 수 있다.
  const liveOrder = useRef(order);
  useEffect(() => {
    // 드래그 중에는 hover 가 직접 채운다 — 여기서 덮으면 한 박자 늦은 값이 들어간다
    if (draggingId === null) liveOrder.current = order;
  });

  /** 머무름을 기다리는 대상·타이머·정착이 끝나는 시각 */
  const pendingTarget = useRef<string | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledAt = useRef(0);
  /** 타이머 안에서는 렌더 시점의 draggingId 를 믿을 수 없다 */
  const draggingRef = useRef<number | null>(null);

  const cancelDwell = useCallback(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = null;
    pendingTarget.current = null;
  }, []);

  // 강조 상태(activeSlot·aimingId)는 값이 바뀔 때만 갱신한다.
  // dragover 는 커서를 멈춰도 계속 들어온다. 같은 값으로 setState 를 부르면
  // 보드가 초당 수십 번 다시 그려지고, 그때마다 useSlideOnReorder 가
  // 모든 블록의 위치를 재서(강제 리플로우) 프레임이 밀린다.
  const activeSlotRef = useRef<number | null>(null);
  const aimingIdRef = useRef<number | null>(null);

  const updateActiveSlot = useCallback((next: number | null) => {
    if (activeSlotRef.current === next) return;
    activeSlotRef.current = next;
    setActiveSlot(next);
  }, []);

  const updateAiming = useCallback((next: number | null) => {
    if (aimingIdRef.current === next) return;
    aimingIdRef.current = next;
    setAimingId(next);
  }, []);

  // 놓지 않은 채 화면을 떠나도 타이머가 남지 않게 한다
  useEffect(() => cancelDwell, [cancelDwell]);

  /** prop 을 ref 로 붙들어 둔다 — 콜백 참조를 고정해야 컨텍스트가 매 렌더 바뀌지 않는다 */
  const onOrderChangedRef = useRef(onOrderChanged);
  useEffect(() => {
    onOrderChangedRef.current = onOrderChanged;
  });

  /** 우리가 위로 올려보낸 목록 — 그게 blocks 로 되돌아온 것은 재조회가 아니다 */
  const [echoed, setEchoed] = useState<StepBlock[] | null>(null);

  // 바뀐 순서를 목록 주인에게 올려보낸다.
  // 좌표를 화면 기준으로 다시 새겨서(renumber) 보낸다 — 순서만 바꿔 보내면
  // 목록은 저장 전 옛 rowIndex·sortOrder 를 그대로 들고 있어, 그걸 읽는 쪽이
  // 이동 전 배치를 본다 (새 블록 자리 계산 nextPosition · 목록을 다시 세우는 경로).
  // 메아리로 잡아 둘 배열은 **캐시에 실제로 들어간 것**이다 (useSetStepBlocks 반환값) —
  // 구조 공유가 참조를 갈아끼우기 때문에 올려보낸 배열을 그대로 들고 있으면
  // 아래 isEcho 가 언제나 어긋난다.
  const publish = useCallback((next: StepBlock[]) => {
    const numbered = renumber(next);
    const stored = onOrderChangedRef.current?.(numbered);
    setEchoed(stored ?? numbered);
  }, []);

  const slide = useSlideOnReorder(draggingId);

  const saver = useLayoutSaver({
    stepId,
    initial: order,
    onSaved: (saved) => {
      // 드래그 도중에 응답이 와도 최신값이 어긋나지 않게 함께 갱신한다
      liveOrder.current = saved;
      setOrder(saved);
      setSaveError('');
      publish(saved);
    },
    onFailed: (message, confirmed) => {
      slide.capture();
      liveOrder.current = confirmed;
      setOrder(confirmed);
      setSaveError(message);
      publish(confirmed);
    },
  });

  useEffect(() => {
    if (!flushLayoutRef) return;

    flushLayoutRef.current = saver.flushNow;
    return () => {
      flushLayoutRef.current = null;
    };
  }, [flushLayoutRef, saver]);

  // 우리가 올려보낸 목록이 그대로 돌아온 것인지.
  // 이건 재조회가 아니다. 구분하지 않으면 저장 응답이 부모를 갱신 → prop 이 바뀜 →
  // 아래 동기화가 돌아 응답을 기다리는 동안 한 이동이 화면에서 되돌아가고
  // 전송도 취소된다. toFlatOrder() 는 아직 저장 전인 옛 좌표로 다시 정렬하므로,
  // 그대로 두면 방금 옮긴 결과가 통째로 뒤집힌다.
  // 블록 ID 나열만 비교하면 안 된다. 다른 사람이 이름·담당자만 바꾼 목록은
  // ID 순서가 같아서 "내가 올린 것" 으로 오인되고, 그 변경을 통째로 무시하게 된다.
  // echoed 는 우리가 올려보낸 배열이 아니라 **캐시가 실제로 보관한 배열**이다 (publish).
  const isEcho = blocks === echoed;

  /** 밖에서 목록이 새로 오면 로컬 순서를 버리고 서버 순서를 따른다 */
  const [synced, setSynced] = useState(blocks);
  // 기준점을 갈아끼울 목록 — reset() 은 타이머를 건드리는 부수 효과라 렌더 중에 부르지 않는다.
  // 처리 후 비우지 않는다. 재조회마다 참조가 달라져 effect 가 한 번씩만 돌고,
  // 비우려고 setState 를 부르면 렌더가 한 번 더 도는 쪽이 오히려 손해다.
  const [resetTarget, setResetTarget] = useState<StepBlock[] | null>(null);
  if (synced !== blocks) {
    setSynced(blocks);
    if (!isEcho) {
      const fresh = toFlatOrder(blocks);
      setOrder(fresh);
      setResetTarget(blocks);
      /*
       * 서버 목록을 새로 받았으면 편집 기준도 갈아끼운다 —
       * 옛 기준과 비교하면 남이 바꾼 배치를 "내가 옮긴 것" 으로 오인해 저장을 묻게 된다.
       */
      if (arrangeBase) setArrangeBase(fresh);
    }
  }

  useEffect(() => {
    if (!resetTarget) return;

    saver.reset(toFlatOrder(resetTarget));
  }, [resetTarget, saver]);

  useDragAutoScroll(draggingId !== null, boardRef);

  /** 머무름을 채운 대상에 실제로 자리를 내준다 */
  const applyMove = useCallback(
    (blockId: number, mode: 'swap' | 'after', key: string) => {
      dwellTimer.current = null;
      pendingTarget.current = null;
      updateAiming(null);

      const dragged = draggingRef.current;
      // 기다리는 사이에 놓았으면 화면을 건드리지 않는다 — 보이는 대로만 확정한다
      if (dragged === null) return;

      const current = liveOrder.current;
      const next =
        mode === 'after'
          ? moveAfter(current, dragged, blockId)
          : moveTo(current, dragged, blockId);

      lastTarget.current = key;
      if (hasSameOrder(next, current)) return;

      slide.capture();
      settledAt.current = Date.now() + SETTLE_MS;
      liveOrder.current = next;
      setOrder(next);
    },
    [slide, updateAiming],
  );

  const start = useCallback(
    (blockId: number) => {
      // 드래그 전이면 liveOrder 가 최신 순서다 (아래 effect 가 매 렌더 맞춰 둔다)
      orderBeforeDrag.current = liveOrder.current;
      lastTarget.current = null;
      draggingRef.current = blockId;
      settledAt.current = 0;
      cancelDwell();
      setDraggingId(blockId);
      updateActiveSlot(null);
      updateAiming(null);
      setSaveError('');
    },
    [cancelDwell, updateActiveSlot, updateAiming],
  );

  const hover = useCallback(
    (blockId: number, mode: 'swap' | 'after') => {
      // state 대신 ref 를 본다 — 참조를 고정해야 컨텍스트가 매 렌더 바뀌지 않는다
      const draggingId = draggingRef.current;
      if (draggingId === null) return;

      updateActiveSlot(mode === 'after' ? blockId : null);

      // 끌고 있는 블록 자신 위의 이벤트.
      // 방금 옮겨져 커서 아래로 들어온 상태다. 여기서 순서를 또 건드리면
      // "이동 → 되돌림" 이 반복돼 블록이 떨린다. 대신 판정만 풀어준다 —
      // 다시 옆 블록으로 넘어가면 그때 한 번 더 교환할 수 있게.
      if (blockId === draggingId) {
        cancelDwell();
        updateAiming(null);
        lastTarget.current = null;
        return;
      }

      // 넓은 블록과 교환하면 커서가 여전히 그 블록 위에 남는다 — 한 번만 처리한다
      const key = `${mode}:${blockId}`;
      if (lastTarget.current === key) return;
      // 이미 이 대상을 기다리는 중이면 타이머를 다시 감지 않는다
      if (pendingTarget.current === key) return;

      // 앞선 이동이 자리를 잡는 중이다 — 움직이는 블록을 기준으로 또 옮기지 않는다
      if (Date.now() < settledAt.current) return;

      // 지나쳐 간 대상은 버린다. 빠르게 훑으면 아무것도 확정되지 않는다
      cancelDwell();
      pendingTarget.current = key;
      updateAiming(mode === 'swap' ? blockId : null);
      dwellTimer.current = setTimeout(
        () => applyMove(blockId, mode, key),
        HOVER_DWELL_MS,
      );
    },
    [applyMove, cancelDwell, updateActiveSlot, updateAiming],
  );

  const finish = useCallback(() => {
    // 놓기·취소·컨테이너 드롭에서 모두 불린다 — 처음 한 번만 처리한다
    if (draggingRef.current === null) return;

    cancelDwell();

    const before = orderBeforeDrag.current;
    const final = liveOrder.current;
    orderBeforeDrag.current = null;
    lastTarget.current = null;
    draggingRef.current = null;

    setDraggingId(null);
    updateActiveSlot(null);
    updateAiming(null);

    if (!before || hasSameOrder(final, before)) return;

    /*
     * 여기서는 저장하지 않는다 — 배치 편집을 끝낼 때 한 번만 보낸다.
     * 다만 화면 순서는 바로 알린다 (새 블록 자리 계산이 옛 좌표를 보면 안 된다).
     */
    publish(final);
  }, [cancelDwell, publish, updateActiveSlot, updateAiming]);

  // 편집 모드에 들어간 순간의 순서를 기준으로 잡고, 나오면 놓아준다.
  // effect 가 아니라 렌더 중 상태 조정이다 (TextBlock 의 autoEdit 처리와 같은 방식) —
  // effect 로 하면 기준이 한 박자 늦게 잡혀 그 사이 이동이 "변경 없음" 으로 새어나간다.
  const [lastArranging, setLastArranging] = useState(isArranging);
  if (lastArranging !== isArranging) {
    setLastArranging(isArranging);
    setArrangeBase(isArranging ? order : null);
  }

  /** 편집을 시작한 뒤 실제로 자리가 바뀌었는지 — 되돌리기 를 보여줄지 정한다 */
  const hasArrangeChanges =
    arrangeBase !== null && !hasSameOrder(order, arrangeBase);

  const arrangeApi: ArrangeHandle = useMemo(
    () => ({
      // 물어볼지 정하는 값이라 state(order) 가 아니라 최신값을 본다
      hasChanges: () =>
        arrangeBase !== null && !hasSameOrder(liveOrder.current, arrangeBase),
      save: () => {
        const final = liveOrder.current;
        // 저장한 배치가 새 기준이다 — 이어서 또 물어보지 않게
        setArrangeBase(final);
        saver.schedule(final);
        saver.flushNow();
      },
      revert: () => {
        if (!arrangeBase || hasSameOrder(liveOrder.current, arrangeBase))
          return;

        slide.capture();
        liveOrder.current = arrangeBase;
        setOrder(arrangeBase);
        setSaveError('');
        publish(arrangeBase);
      },
    }),
    [arrangeBase, publish, saver, slide],
  );

  useEffect(() => {
    if (!arrangeRef) return;

    arrangeRef.current = arrangeApi;
    return () => {
      arrangeRef.current = null;
    };
  }, [arrangeRef, arrangeApi]);

  // 컨텍스트 값은 draggingId 가 바뀔 때만 새로 만든다.
  // 매 렌더 새 객체를 내려주면 강조 표시가 바뀔 때마다 모든 BlockCard 가
  // 다시 그려진다 (본문에 에디터·파일 목록이 달린 카드까지).
  // 키보드로 한 칸 옮긴다.
  // liveOrder 는 ref 라 이 함수의 참조가 고정된다 — 컨텍스트를 매 렌더 새로 만들지 않아
  // 카드가 통째로 다시 그려지지 않는다 (드래그 배선과 같은 이유).
  const moveBy = useCallback(
    (blockId: number, delta: -1 | 1) => {
      const current = liveOrder.current;
      const from = current.findIndex((block) => block.blockId === blockId);
      if (from === -1) return;

      const to = from + delta;
      // 양 끝에서는 아무 일도 하지 않는다 — 드래그로 밖에 놓은 것과 같다
      if (to < 0 || to >= current.length) return;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      slide.capture();
      liveOrder.current = next;
      setOrder(next);
      // 드래그의 finish 와 같은 자리 — 저장은 배치 완료 때 한 번만 한다
      publish(next);
    },
    [publish, slide],
  );

  const drag: BlockDragValue = useMemo(
    () => ({ draggingId, start, hover, finish, moveBy }),
    [draggingId, start, hover, finish, moveBy],
  );

  /** 드래그 배선과 같은 이유로 참조를 고정한다 — 매 렌더 바뀌면 카드가 전부 다시 그려진다 */
  const patch = useCallback(
    (updated: UpdateBlockResponse) => {
      const current = liveOrder.current;
      const index = current.findIndex(
        (block) => block.blockId === updated.blockId,
      );
      if (index === -1) return;

      const next = [...current];
      // 자리(rowIndex·sortOrder·colSpan)와 본문(detail)은 그대로 둔다 —
      // 바뀐 두 값만 갈아끼워야 배치도 안 흔들리고 본문도 다시 불러오지 않는다
      next[index] = {
        ...current[index],
        title: updated.title,
        // 응답에 deleted 가 없을 수 있다 — 그대로 꽂으면 (퇴사자) 표기가 사라진다
        owner: normalizeUpdatedOwner(updated.owner, current[index].owner),
        /*
         * version 을 빠뜨리면 안 된다 — 서버는 이미 올려 놓았다.
         * 옛 값을 든 채로 두면 다음 수정도, 배치 저장도 전부 409 다
         * (배치는 이 블록의 version 을 그대로 실어 보낸다).
         */
        version: updated.version,
      };

      liveOrder.current = next;
      setOrder(next);
      publish(next);
    },
    [publish],
  );

  const remove = useCallback(
    (blockId: number) => {
      const current = liveOrder.current;
      const next = current.filter((block) => block.blockId !== blockId);
      if (next.length === current.length) return;

      liveOrder.current = next;
      setOrder(next);
      publish(next);
      /*
       * 배치를 다시 보내지 않는다. 남은 블록의 서버 좌표는 그대로고,
       * 어차피 화면도 서버도 "평면 순서를 3칸씩 다시 패킹" 하는 같은 규칙을 쓴다 —
       * 빈 번호가 생겨도 순서는 달라지지 않는다.
       */
    },
    [publish],
  );

  const actions: BlockActions = useMemo(
    () => ({ patch, remove }),
    [patch, remove],
  );

  const rows = useMemo(() => computeRows(order), [order]);
  const isDragging = draggingId !== null;
  const lastRow = rows.at(-1);
  // "맨 뒤" 로 보낼 빈 행. 드래그 중에는 항상 깔아 둔다.
  // 마지막 행이 꽉 찼을 때만 넣으면, 블록을 옮길 때마다 행 수가 오르내려
  // 보드 전체 높이가 출렁인다 — 옮기려는 자리를 눈으로 좇을 수 없다.
  const needsTailSlot = isDragging && lastRow !== undefined;

  if (order.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-default px-4 py-10 text-center text-label text-text-secondary">
        아직 블록이 없습니다. `블록 추가` 로 시작하세요.
      </p>
    );
  }

  return (
    <BlockActionsProvider value={actions}>
      <BlockCanEditProvider value={canEdit}>
        <BlockMembersProvider value={members}>
          {/* 편집 모드가 아니면 배선을 아예 내려주지 않는다 — 카드가 드래그 핸들 없이 그려진다 */}
          <BlockDragProvider value={isArranging ? drag : null}>
            <div className="flex flex-col gap-4">
              {isArranging && (
                <div className="flex items-center gap-2 rounded-button-sm border border-border-primary/30 bg-blue-bg-soft px-2.5 py-1.5 text-caption text-text-primary-blue">
                  <p className="min-w-0 flex-1">
                    블록을 끌어 자리를 바꾼 뒤 <strong>배치 완료</strong> 를
                    눌러주세요. 저장은 그때 한 번만 이뤄집니다.
                  </p>
                  {hasArrangeChanges && (
                    <button
                      type="button"
                      onClick={() => arrangeApi.revert()}
                      className="shrink-0 cursor-pointer rounded-button-sm px-1.5 py-0.5 font-medium underline-offset-2 hover:bg-bg-card hover:underline"
                    >
                      되돌리기
                    </button>
                  )}
                </div>
              )}

              {saveError && (
                <p
                  role="alert"
                  className="rounded-button-sm border border-border-danger/20 bg-red-bg-soft px-2.5 py-1.5 text-caption text-text-danger"
                >
                  {saveError}
                </p>
              )}

              <div
                ref={boardRef}
                // 끄는 동안 텍스트가 파랗게 잡히면 이동이 지저분해 보인다
                /*
                  좁은 화면에서는 3열을 1열로 접는다 — 3분할하면 한 칸이 100px 남짓이라
                  체크리스트 · 문서 블록의 본문이 글자 하나 폭으로 눌린다.
                  행 계산(`computeRows`)은 그대로 두고 **보이는 배치만** 접는다 —
                  순서(`rowIndex` · `sortOrder`)는 서버 값이라 화면 폭으로 바꾸면 안 된다.
                */
                className={`grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 ${
                  isDragging ? 'select-none' : ''
                }`}
                /*
            **캡처 단계에서 받는다. 버블 단계로 받으면 카드 안쪽 자식이 이벤트를 멈췄을 때
            판정이 통째로 빠지고, 그 블록은 "드래그해도 반응이 없는 블록" 이 된다.
            여백에 놓아도 취소되지 않도록 preventDefault 는 항상 건다.
          */
                onDragOverCapture={(event) => {
                  // 블록 드래그가 아닐 때(예: 바탕화면 파일)는 손대지 않는다
                  if (draggingId === null) return;

                  // 여백에 놓아도 취소되지 않도록 항상 건다
                  event.preventDefault();

                  const target = readDropTarget(event.target);
                  if (target) drag.hover(target.blockId, target.mode);
                }}
                onDropCapture={(event) => {
                  if (draggingId === null) return;

                  event.preventDefault();
                  drag.finish();
                }}
              >
                {/*
            행 단위로 훑되 **평평한 배열 하나**로 내보낸다 (Fragment 로 묶지 않는다).
            빈 칸 안내는 행의 마지막 블록 뒤에 꽂아 grid 가 남은 칸에 배치하게 둔다.
          */}
                {rows.flatMap((row, rowIndex) => {
                  const cells = row.map((block) => (
                    <div
                      key={block.blockId}
                      ref={slide.register(block.blockId)}
                      data-drop-block={block.blockId}
                      // 겨누는 중 — 자리를 내주기 직전이라는 신호
                      className={`min-w-0 rounded-lg ${
                        COL_SPAN_CLASS[toSpan(block.colSpan)]
                      } ${
                        aimingId === block.blockId
                          ? 'ring-2 ring-border-primary/40 ring-offset-2'
                          : ''
                      }`}
                    >
                      <BlockBody
                        /*
                         * 새로고침 때마다 바뀌는 key — 본문을 다시 마운트한다.
                         *
                         * 블록 본문은 저마다 서버 상태를 따로 들고 있다. detail 을 첫 렌더에
                         * 베껴 두는 유형(체크리스트·이미지·결재·AI)도 있고, 자기 API 를
                         * 직접 부르는 유형(문서·결재·AI)도 있어 목록만 새로 받아서는
                         * 어느 쪽도 갱신되지 않는다.
                         *
                         * 사용자가 새로고침을 눌렀을 때만 바뀐다 — 화면 복귀·블록 생성 같은
                         * 자동 재조회에서 본문이 통째로 리셋되면 설명되지 않는 움직임이 된다.
                         */
                        key={`${block.blockId}:${bodyGeneration}`}
                        block={block}
                        autoEdit={block.blockId === autoEditBlockId}
                      />
                    </div>
                  ));

                  const free = BLOCK_COLUMNS - usedColumns(row);
                  const rowLast = row[row.length - 1];

                  // 마지막 행의 빈 칸은 아래 꼬리 자리와 뜻이 같다 — 둘 다 켜지면 어디로 갈지 헷갈린다
                  if (isDragging && free > 0 && rowIndex < rows.length - 1) {
                    cells.push(
                      <DropSlot
                        key={`slot-${rowIndex}`}
                        span={free}
                        afterBlockId={rowLast.blockId}
                        isActive={activeSlot === rowLast.blockId}
                      />,
                    );
                  }

                  return cells;
                })}

                {needsTailSlot && lastRow && (
                  <DropSlot
                    key="slot-tail"
                    span={BLOCK_COLUMNS}
                    label="맨 뒤로 보내기"
                    afterBlockId={lastRow[lastRow.length - 1].blockId}
                    isActive={
                      activeSlot === lastRow[lastRow.length - 1].blockId
                    }
                  />
                )}
              </div>
            </div>
          </BlockDragProvider>
        </BlockMembersProvider>
      </BlockCanEditProvider>
    </BlockActionsProvider>
  );
}

// 블록이 없는 칸에 놓을 수 있게 열어두는 자리.
// 드래그 중에만 나타나고, 남은 칸 수만큼 폭을 차지한다.
function DropSlot({
  span,
  afterBlockId,
  isActive,
  label = '여기에 놓기',
}: {
  span: number;
  /** 이 블록 바로 뒤 자리를 뜻한다 — 판정은 보드가 캡처 단계에서 한다 */
  afterBlockId: number;
  isActive: boolean;
  label?: string;
}) {
  return (
    <div
      aria-hidden
      data-drop-after={afterBlockId}
      className={`flex min-h-16 items-center justify-center rounded-lg border border-dashed text-caption transition-colors ${
        COL_SPAN_CLASS[span]
      } ${
        isActive
          ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
          : 'border-border-default text-text-secondary'
      }`}
    >
      {label}
    </div>
  );
}

// 유형별 본문 분기. 아직 구현되지 않은 유형은 껍데기만 그린다.
// memo 로 감싼다. 강조 표시나 순서가 바뀌어 보드가 다시 그려질 때
// 블록 본문(에디터·체크리스트·파일 목록)까지 다시 그리면 이동이 버벅인다.
// moveTo/moveAfter 는 블록 객체를 그대로 옮기므로 순서만 바뀌면 여기서 멈춘다.
const BlockBody = memo(function BlockBody({
  block,
  autoEdit,
}: {
  block: StepBlock;
  autoEdit: boolean;
}) {
  if (block.type === 'CHECKLIST') return <ChecklistBlock block={block} />;
  if (block.type === 'TEXT')
    return <TextBlock block={block} autoEdit={autoEdit} />;
  if (block.type === 'FILE') return <FileBlock block={block} />;
  if (block.type === 'IMAGE')
    return <ImageBlock block={block} autoUpload={autoEdit} />;
  if (block.type === 'APPROVAL') return <ApprovalBlock block={block} />;
  if (block.type === 'AI') return <AiBlock block={block} />;
  if (block.type === 'SETTLEMENT') return <SettlementBlock block={block} />;

  // TODO: 유형별 블록 구현 (BID_NOTICE·…)
  return (
    <BlockCard block={block}>
      <p className="text-caption text-text-secondary">준비 중인 블록입니다.</p>
    </BlockCard>
  );
});
