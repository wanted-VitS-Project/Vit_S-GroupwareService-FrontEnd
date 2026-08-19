'use client';

// 블록 배치 저장 — 드래그가 멎은 뒤에 모아서 한 번만 보낸다.
import { useEffect, useRef, useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';

import { updateBlockLayout } from './api';
import {
  applyLayouts,
  computeRows,
  toLayoutOrders,
  toLayouts,
} from './blockLayout';
import { LAYOUT_CONFLICT_MESSAGE, layoutErrorMessage } from './errorCodes';
import { notifyBlockChanged } from './events';
import type { BlockLayout, StepBlock } from './types';

// 마지막 이동 후 이만큼 조용하면 그때 보낸다.
// 블록을 몇 번 연달아 옮기는 동안 요청이 매번 나가면 서버도 화면도 시끄럽다.
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

export interface LayoutSaver {
  /** 이동을 예약한다. 계속 움직이는 동안에는 타이머만 밀린다 */
  schedule: (next: StepBlock[]) => void;
  /** 대기 중인 배치를 지금 보낸다 (블록 생성처럼 목록이 곧 바뀔 때 먼저 흘려보낸다) */
  flushNow: () => void;
  // 사용자가 저장 을 누른 순간 — 지문이 같아 보여도 **반드시** 보낸다.
  // 기준(confirmed)이 아직 저장하지 않은 배치로 오염되면 "달라진 게 없다" 며
  // 요청을 건너뛰고, 오류도 없이 화면만 옮겨진 채로 남는다 (새로고침하면 원복).
  saveNow: (next: StepBlock[]) => void;
  /** 서버 목록을 새로 받았을 때 기준점을 갈아끼운다 (대기 중이던 이동은 버린다) */
  reset: (next: StepBlock[]) => void;
}

// 블록 배치 저장을 맡는다.
// - 조용해지면 보낸다 — 이동할 때마다가 아니라 QUIET_MS 동안 더 안 움직일 때
// - 같으면 안 보낸다 — 마지막으로 저장된 배치와 지문이 같으면 요청 자체를 건너뛴다
// - 단, 저장 을 누르면 무조건 보낸다 (saveNow) — 이 건너뛰기가 조용한 유실의 통로다
// - 한 번에 하나만 보낸다 — 앞 요청이 끝나야 다음이 나간다. 둘을 동시에 띄우면
// 서버 처리 순서가 뒤바뀌어 옛 배치가 최종 상태로 남을 수 있다
// - 떠나도 보낸다 — 언마운트 시 대기 중인 배치를 흘려보내지 않고 마지막으로 한 번 보낸다
// 반환하는 객체는 참조가 고정돼 effect 의존성에 그대로 넣을 수 있다.
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
  /** 실패 시 되돌릴 마지막으로 저장된 배치를 함께 준다 */
  onFailed: (message: string, confirmed: StepBlock[]) => void;
}): LayoutSaver {
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
  /** 지금 서버에 나가 있는 요청이 있는지 — 있으면 다음 요청은 끝난 뒤에 보낸다 */
  const isSending = useRef(false);
  /** 지문이 같아도 반드시 보내야 하는 요청인지 (사용자가 저장 을 누른 경우) */
  const mustSend = useRef(false);
  // 목록 세대. reset() 마다 올라간다.
  // 진행 중이던 응답이 더 새로운 목록을 덮어쓰지 않게 막는 장치다 —
  // 블록을 만들어 재조회가 끝난 뒤 옛 저장 응답이 도착하면 새 블록이 사라진다.
  const generation = useRef(0);
  const isMounted = useRef(true);

  const handlers = useRef({ onSaved, onFailed, stepId });
  useEffect(() => {
    handlers.current = { onSaved, onFailed, stepId };
  });

  function send(next: StepBlock[], force = false) {
    const rows = computeRows(next);
    const mark = fingerprint(toLayouts(rows));
    // 옮겼다가 되돌린 경우 — 결과가 저장된 배치와 같으면 보낼 이유가 없다.
    // 사용자가 저장 을 누른 경우(force)는 예외다 — 기준이 옳다는 보장이 없다.
    if (!force && mark === confirmedMark.current) return;

    /*
     * version 이 하나라도 없으면 보내지 않는다 — 항목별 락이라 전부 실패한다.
     * 저장이 불가능하므로 화면도 마지막으로 저장된 배치로 되돌린다.
     */
    const orders = toLayoutOrders(rows);
    if (!orders) {
      handlers.current.onFailed(
        '버전 정보가 없어 배치를 저장하지 못했습니다. 새로고침해주세요.',
        confirmed.current,
      );
      return;
    }

    const sentAt = generation.current;
    isSending.current = true;

    updateBlockLayout(handlers.current.stepId, orders)
      .then((saved) => {
        // 보내는 사이에 서버 목록이 새로 왔다 — 그 결과를 덮지 않는다
        if (generation.current !== sentAt) return;

        const applied = applyLayouts(next, saved);
        confirmed.current = applied;
        confirmedMark.current = fingerprintOf(applied);

        if (isMounted.current) handlers.current.onSaved(applied);
      })
      .catch((caught: unknown) => {
        if (generation.current !== sentAt || !isMounted.current) return;

        /*
         * 409 — 항목 하나라도 버전이 어긋나면 요청 전체가 롤백된다.
         * overwrite 가 없어 재전송으로는 절대 통과하지 못하므로,
         * 되돌리는 것으로 끝내지 않고 목록을 다시 읽게 한다 (그래야 새 version 이 온다).
         */
        if (caught instanceof ApiError && caught.status === 409) {
          handlers.current.onFailed(LAYOUT_CONFLICT_MESSAGE, confirmed.current);
          notifyBlockChanged();
          return;
        }

        handlers.current.onFailed(
          layoutErrorMessage(
            caught instanceof ApiError ? caught.code : undefined,
          ) ?? messageOf(caught, '블록 배치를 저장하지 못했습니다.'),
          confirmed.current,
        );
      })
      .finally(() => {
        isSending.current = false;
        // 기다리는 사이에 또 옮겼다면 이제 보낸다 — 항상 마지막 배치만 나간다
        if (pending.current) flushRef.current();
      });
  }

  function flush(force = false) {
    // 앞 요청이 나가 있으면 이어 보낼 때까지 "반드시 보낸다" 는 표시를 들고 있는다
    if (force) mustSend.current = true;

    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    // 나가 있는 요청이 끝날 때까지 붙들고 있는다 (finally 에서 이어 보낸다)
    if (isSending.current) return;

    const next = pending.current;
    pending.current = null;
    if (!next) return;

    const forced = mustSend.current;
    mustSend.current = false;
    send(next, forced);
  }

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    // StrictMode 는 같은 ref 를 둔 채 setup·cleanup 을 다시 돈다 — 여기서 되살린다
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      // 화면을 떠나도 마지막 이동은 살린다
      flushRef.current();
    };
  }, []);

  // 참조를 고정한다 — effect 의존성에 넣어도 매 렌더 다시 돌지 않는다
  const [api] = useState<LayoutSaver>(() => ({
    schedule(next) {
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushRef.current(), QUIET_MS);
    },
    flushNow() {
      flushRef.current();
    },
    saveNow(next) {
      pending.current = next;
      flushRef.current(true);
    },
    reset(next) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current = null;
      mustSend.current = false;
      // 진행 중이던 응답이 이 기준을 덮지 않게 세대를 올린다
      generation.current += 1;
      confirmed.current = next;
      confirmedMark.current = fingerprintOf(next);
    },
  }));

  return api;
}
