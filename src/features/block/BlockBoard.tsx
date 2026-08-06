'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import BlockCard from './BlockCard';
import {
  computeRows,
  hasSameOrder,
  moveAfter,
  moveTo,
  toFlatOrder,
  toSpan,
} from './blockLayout';
import { BlockDragProvider, type BlockDragValue } from './BlockDragContext';
import ChecklistBlock from './ChecklistBlock';
import FileBlock from './FileBlock';
import TextBlock from './TextBlock';
import { BLOCK_COLUMNS, type StepBlock } from './types';
import { useDragAutoScroll } from './useDragAutoScroll';
import { useLayoutSaver } from './useLayoutSaver';
import { SLIDE_DURATION_MS, useSlideOnReorder } from './useSlideOnReorder';

/**
 * 대상 위에 이만큼 **머문 뒤에야** 자리를 옮긴다.
 * 빠르게 훑고 지나가는 블록마다 교환하면 이동이 연쇄돼 배치가 통째로 흐트러진다.
 */
const HOVER_DWELL_MS = 110;

/**
 * 한 번 옮긴 뒤 자리가 잡힐 때까지 새 판정을 받지 않는다.
 * 미끄러지는 도중에 판정하면 아직 움직이는 중인 블록을 기준으로 또 옮기게 된다.
 */
const SETTLE_MS = SLIDE_DURATION_MS;

/** Tailwind 가 조합된 클래스명을 못 읽으므로 완성된 문자열로 매핑한다 */
const COL_SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
};

/** 지금 겨누고 있는 자리 */
interface DropTarget {
  blockId: number;
  /** `swap` — 대상과 자리 교환 · `after` — 대상 바로 뒤 (빈 칸 안내) */
  mode: 'swap' | 'after';
}

function usedColumns(row: StepBlock[]) {
  return row.reduce((total, block) => total + toSpan(block.colSpan), 0);
}

/**
 * 커서 아래 요소에서 어느 자리를 겨누고 있는지 읽는다.
 *
 * 칸(grid item)에 남긴 `data-*` 를 거슬러 올라가 찾는다 — 카드 내부 구조와 무관해서
 * 파일 목록 · 에디터처럼 자체 드래그 처리를 하는 자식 위에서도 판정이 된다.
 */
function readDropTarget(target: EventTarget | null): DropTarget | null {
  if (!(target instanceof Element)) return null;

  const cell = target.closest('[data-drop-block],[data-drop-after]');
  if (!(cell instanceof HTMLElement)) return null;

  const after = cell.dataset.dropAfter;
  if (after !== undefined) return { blockId: Number(after), mode: 'after' };

  return { blockId: Number(cell.dataset.dropBlock), mode: 'swap' };
}

/**
 * 스텝 화면의 블록 보드.
 *
 * 가로는 3칸 고정, 세로는 제한 없이 늘어난다.
 * 순서는 **평면 배열 하나**로 들고, 행 나누기는 3열 grid 의 자동 배치에 맡긴다 —
 * "남은 칸에 안 들어가면 다음 줄, 되돌아가 채우지 않는다" 가 `computeRows()` 와 같은 규칙이고,
 * 같은 행 높이 공유도 grid 가 해준다.
 *
 * 드래그 중에는 **순서 자체를 그때그때 바꾼다** (미리보기를 따로 계산하지 않는다).
 * 시작 시점 순서에서 매번 다시 계산하면, 한 번 옮긴 뒤에는 같은 블록을 다시 겨눠도
 * 결과가 늘 같아서 **되돌리거나 가운데로 다시 넣을 수가 없다.**
 *
 * ⚠️ 행마다 래퍼(또는 keyed Fragment)를 두면 순서가 바뀔 때 래퍼 key 가 달라져
 *    **행 전체가 재마운트**된다 (블록이 사라졌다 다시 그려지며 깜빡인다).
 *    래퍼 없이 하나의 평평한 목록으로 내보내고 블록만 `blockId` 로 keying 한다.
 */
export default function BlockBoard({
  stepId,
  blocks,
  autoEditBlockId,
  onLayoutSaved,
}: {
  stepId: string;
  blocks: StepBlock[];
  /** 방금 만든 블록 — 편집 입력창을 곧바로 띄운다 */
  autoEditBlockId?: number | null;
  /** 저장된 배치를 목록 주인에게 돌려준다 — 새 블록 자리 계산이 옛 좌표를 쓰지 않게 */
  onLayoutSaved?: (blocks: StepBlock[]) => void;
}) {
  const [order, setOrder] = useState(() => toFlatOrder(blocks));
  const [draggingId, setDraggingId] = useState<number | null>(null);
  /** 커서가 올라가 있는 빈 칸 안내 — 강조 표시에만 쓴다 */
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  /** 머무름을 기다리는 중인 대상 — "지금 여기를 겨누고 있다" 를 보여준다 */
  const [aimingId, setAimingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);

  /** 드래그를 시작할 때의 순서 — 끝나고 정말 달라졌는지 비교한다 */
  const orderBeforeDrag = useRef<StepBlock[] | null>(null);
  /** 직전에 처리한 대상. 같은 블록 위에서 이벤트가 계속 와도 반복 교환하지 않는다 */
  const lastTarget = useRef<string | null>(null);
  /**
   * `order` 의 최신값. `dragover` 로 인한 갱신은 렌더가 밀릴 수 있어,
   * `drop` 시점에 state 만 믿으면 한 번 늦은 순서를 저장할 수 있다.
   */
  const liveOrder = useRef(order);
  useEffect(() => {
    // 드래그 중에는 hover 가 직접 채운다 — 여기서 덮으면 한 박자 늦은 값이 들어간다
    if (draggingId === null) liveOrder.current = order;
  });

  /** 머무름을 기다리는 대상 · 타이머 · 정착이 끝나는 시각 */
  const pendingTarget = useRef<string | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledAt = useRef(0);
  /** 타이머 안에서는 렌더 시점의 `draggingId` 를 믿을 수 없다 */
  const draggingRef = useRef<number | null>(null);

  function cancelDwell() {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = null;
    pendingTarget.current = null;
  }

  // 놓지 않은 채 화면을 떠나도 타이머가 남지 않게 한다
  useEffect(() => cancelDwell, []);

  const saver = useLayoutSaver({
    stepId,
    initial: order,
    onSaved: (saved) => {
      // 드래그 도중에 응답이 와도 최신값이 어긋나지 않게 함께 갱신한다
      liveOrder.current = saved;
      setOrder(saved);
      setSaveError('');
      onLayoutSaved?.(saved);
    },
    onFailed: (message, confirmed) => {
      liveOrder.current = confirmed;
      setOrder(confirmed);
      setSaveError(message);
    },
  });

  /** 재조회로 목록이 새로 오면 로컬 순서를 버리고 서버 순서를 따른다 */
  const [synced, setSynced] = useState(blocks);
  if (synced !== blocks) {
    const fromServer = toFlatOrder(blocks);
    setSynced(blocks);
    setOrder(fromServer);
    saver.reset(fromServer);
  }

  const registerNode = useSlideOnReorder(draggingId);
  useDragAutoScroll(draggingId !== null, boardRef);

  /** 머무름을 채운 대상에 실제로 자리를 내준다 */
  function applyMove(blockId: number, mode: 'swap' | 'after', key: string) {
    dwellTimer.current = null;
    pendingTarget.current = null;
    setAimingId(null);

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

    settledAt.current = Date.now() + SETTLE_MS;
    liveOrder.current = next;
    setOrder(next);
  }

  const drag: BlockDragValue = {
    draggingId,
    start: (blockId) => {
      orderBeforeDrag.current = order;
      lastTarget.current = null;
      liveOrder.current = order;
      draggingRef.current = blockId;
      settledAt.current = 0;
      cancelDwell();
      setDraggingId(blockId);
      setActiveSlot(null);
      setAimingId(null);
      setSaveError('');
    },
    hover: (blockId, mode) => {
      if (draggingId === null) return;

      const slot = mode === 'after' ? blockId : null;
      if (slot !== activeSlot) setActiveSlot(slot);

      /**
       * 끌고 있는 블록 자신 위의 이벤트.
       *
       * 방금 옮겨져 커서 아래로 들어온 상태다. 여기서 순서를 또 건드리면
       * "이동 → 되돌림" 이 반복돼 블록이 떨린다. 대신 **판정만 풀어준다** —
       * 다시 옆 블록으로 넘어가면 그때 한 번 더 교환할 수 있게.
       */
      if (blockId === draggingId) {
        cancelDwell();
        setAimingId(null);
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
      setAimingId(mode === 'swap' ? blockId : null);
      dwellTimer.current = setTimeout(
        () => applyMove(blockId, mode, key),
        HOVER_DWELL_MS,
      );
    },
    finish: () => {
      // 놓기 · 취소 · 컨테이너 드롭에서 모두 불린다 — 처음 한 번만 처리한다
      if (draggingId === null) return;

      cancelDwell();

      const before = orderBeforeDrag.current;
      const final = liveOrder.current;
      orderBeforeDrag.current = null;
      lastTarget.current = null;
      draggingRef.current = null;

      setDraggingId(null);
      setActiveSlot(null);
      setAimingId(null);

      // 화면은 이미 확정돼 있다 — 전송만 더 움직이지 않을 때까지 미룬다
      if (before && !hasSameOrder(final, before)) saver.schedule(final);
    },
  };

  const rows = useMemo(() => computeRows(order), [order]);
  const isDragging = draggingId !== null;
  const lastRow = rows.at(-1);
  /**
   * "맨 뒤" 로 보낼 빈 행. 드래그 중에는 **항상** 깔아 둔다.
   *
   * 마지막 행이 꽉 찼을 때만 넣으면, 블록을 옮길 때마다 행 수가 오르내려
   * 보드 전체 높이가 출렁인다 — 옮기려는 자리를 눈으로 좇을 수 없다.
   */
  const needsTailSlot = isDragging && lastRow !== undefined;

  if (order.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#1C1F2A]/10 px-4 py-10 text-center text-xs text-[#6C7389]">
        아직 블록이 없습니다. `Block 추가` 로 시작해보세요.
      </p>
    );
  }

  return (
    <BlockDragProvider value={drag}>
      <div className="flex flex-col gap-4">
        {saveError && (
          <p
            role="alert"
            className="rounded border border-[#E7000B]/20 bg-[#E7000B]/5 px-2.5 py-1.5 text-[10px] text-[#E7000B]"
          >
            {saveError}
          </p>
        )}

        <div
          ref={boardRef}
          // 끄는 동안 텍스트가 파랗게 잡히면 이동이 지저분해 보인다
          className={`grid grid-cols-3 items-stretch gap-4 ${
            isDragging ? 'select-none' : ''
          }`}
          /*
            **캡처 단계**에서 받는다. 버블 단계로 받으면 카드 안쪽 자식이 이벤트를 멈췄을 때
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
                ref={registerNode(block.blockId)}
                data-drop-block={block.blockId}
                // 겨누는 중 — 자리를 내주기 직전이라는 신호
                className={`min-w-0 rounded-lg ${
                  COL_SPAN_CLASS[toSpan(block.colSpan)]
                } ${
                  aimingId === block.blockId
                    ? 'ring-2 ring-[#3B5BDB]/40 ring-offset-2'
                    : ''
                }`}
              >
                <BlockBody
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
              isActive={activeSlot === lastRow[lastRow.length - 1].blockId}
            />
          )}
        </div>
      </div>
    </BlockDragProvider>
  );
}

/**
 * 블록이 없는 칸에 놓을 수 있게 열어두는 자리.
 * 드래그 중에만 나타나고, 남은 칸 수만큼 폭을 차지한다.
 */
function DropSlot({
  span,
  afterBlockId,
  isActive,
  label = '여기에 놓기',
}: {
  span: number;
  /** 이 블록 **바로 뒤** 자리를 뜻한다 — 판정은 보드가 캡처 단계에서 한다 */
  afterBlockId: number;
  isActive: boolean;
  label?: string;
}) {
  return (
    <div
      aria-hidden
      data-drop-after={afterBlockId}
      className={`flex min-h-16 items-center justify-center rounded-lg border border-dashed text-[10px] transition-colors ${
        COL_SPAN_CLASS[span]
      } ${
        isActive
          ? 'border-[#3B5BDB] bg-[#3B5BDB]/5 text-[#3B5BDB]'
          : 'border-[#1C1F2A]/15 text-[#6C7389]'
      }`}
    >
      {label}
    </div>
  );
}

/** 유형별 본문 분기. 아직 구현되지 않은 유형은 껍데기만 그린다 */
function BlockBody({
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

  // TODO: 유형별 블록 구현 (IMAGE · APPROVAL · PAYMENT_CONFIRM · …)
  return (
    <BlockCard block={block}>
      <p className="text-[10px] text-[#6C7389]">준비 중인 블록입니다.</p>
    </BlockCard>
  );
}
