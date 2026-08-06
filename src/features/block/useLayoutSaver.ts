'use client';

import { useEffect, useRef, useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';

import { updateBlockLayout } from './api';
import { applyLayouts, computeRows, toLayouts } from './blockLayout';
import { layoutErrorMessage } from './errorCodes';
import type { BlockLayout, StepBlock } from './types';

/**
 * 마지막 이동 후 이만큼 조용하면 그때 보낸다.
 * 블록을 몇 번 연달아 옮기는 동안 요청이 매번 나가면 서버도 화면도 시끄럽다.
 */
const QUIET_MS = 800;

/** 배치가 실제로 달라졌는지 비교하는 지문 */
function fingerprint(layouts: BlockLayout[]) {
  return layouts
    .map(
      (layout) =>
        `${layout.blockId}:${layout.rowIndex}:${layout.sortOrder}:${layout.colSpan}`,
    )
    .join('|');
}

function fingerprintOf(blocks: StepBlock[]) {
  return fingerprint(toLayouts(computeRows(blocks)));
}

/**
 * 블록 배치 저장을 맡는다.
 *
 * - **조용해지면 보낸다** — 이동할 때마다가 아니라 `QUIET_MS` 동안 더 안 움직일 때
 * - **같으면 안 보낸다** — 마지막으로 저장된 배치와 지문이 같으면 요청 자체를 건너뛴다
 * - **떠나도 보낸다** — 언마운트 시 대기 중인 배치를 흘려보내지 않고 마지막으로 한 번 보낸다
 */
export function useLayoutSaver({
  stepId,
  initial,
  onSaved,
  onFailed,
}: {
  stepId: string;
  /** 처음 받은 서버 배치 — 첫 저장이 실패했을 때 돌아갈 자리다 */
  initial: StepBlock[];
  onSaved: (blocks: StepBlock[]) => void;
  /** 실패 시 되돌릴 **마지막으로 저장된** 배치를 함께 준다 */
  onFailed: (message: string, confirmed: StepBlock[]) => void;
}) {
  // 첫 기준점은 한 번만 계산한다 (렌더 중 ref 를 쓰지 않으려고 state 로 씨앗을 만든다)
  const [seed] = useState(() => ({
    blocks: initial,
    mark: fingerprintOf(initial),
  }));
  /** 서버가 확인해 준 마지막 배치 — 실패했을 때 돌아갈 자리 */
  const confirmed = useRef(seed.blocks);
  const confirmedMark = useRef(seed.mark);
  const pending = useRef<StepBlock[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 응답이 순서를 바꿔 도착해도 최신 요청만 반영한다 */
  const latest = useRef(0);
  const isMounted = useRef(true);

  // 화면이 사라진 뒤에는 상태를 건드리지 않는다 (요청 자체는 그대로 나간다)
  const handlers = useRef({ onSaved, onFailed, stepId });
  useEffect(() => {
    handlers.current = { onSaved, onFailed, stepId };
  });

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    const next = pending.current;
    pending.current = null;
    if (!next) return;

    const layouts = toLayouts(computeRows(next));
    const mark = fingerprint(layouts);
    // 옮겼다가 되돌린 경우 — 결과가 저장된 배치와 같으면 보낼 이유가 없다
    if (mark === confirmedMark.current) return;

    const saveId = latest.current + 1;
    latest.current = saveId;

    updateBlockLayout(handlers.current.stepId, layouts)
      .then((saved) => {
        if (latest.current !== saveId) return;

        const applied = applyLayouts(next, saved);
        confirmed.current = applied;
        confirmedMark.current = fingerprintOf(applied);

        if (isMounted.current) handlers.current.onSaved(applied);
      })
      .catch((caught: unknown) => {
        if (latest.current !== saveId || !isMounted.current) return;

        handlers.current.onFailed(
          layoutErrorMessage(
            caught instanceof ApiError ? caught.code : undefined,
          ) ?? messageOf(caught, '블록 배치를 저장하지 못했습니다.'),
          confirmed.current,
        );
      });
  }

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // 화면을 떠나도 마지막 이동은 살린다
      flushRef.current();
    };
  }, []);

  return {
    /** 이동을 예약한다. 계속 움직이는 동안에는 타이머만 밀린다 */
    schedule(next: StepBlock[]) {
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushRef.current(), QUIET_MS);
    },
    /** 서버 목록을 새로 받았을 때 기준점을 갈아끼운다 (대기 중이던 이동은 버린다) */
    reset(next: StepBlock[]) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current = null;
      // 진행 중이던 응답이 새 기준을 덮지 않게 한 칸 올린다
      latest.current += 1;
      confirmed.current = next;
      confirmedMark.current = fingerprintOf(next);
    },
  };
}
