'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * 모달 · 패널 여닫이 상태를 한 가지 모양으로 통일한다.
 *
 * 이 프로젝트의 모달은 전부 **조건부 렌더**다 (`{isOpen && <Modal .../>}`) —
 * `Modal` 컴포넌트에 `isOpen` 이 없고, 그렸다 지우면 `<dialog>` 가 열리고 닫힌다.
 * 그래서 필요한 것은 "열렸나" 하나뿐인데, 컴포넌트마다 `isOpen` · `isEditing` ·
 * `isDeleting` · `isViewingLogs` 처럼 이름만 다른 `useState(false)` 가 흩어져 있었다.
 *
 * 셋 중 상황에 맞는 것을 고른다.
 *
 * | 훅 | 쓰는 곳 |
 * | --- | --- |
 * | `useModal` | 모달이 하나뿐 (`AddBlockButton`) |
 * | `useModalRouter` | **동시에 하나만** 떠야 하는 모달 여러 개 (`BlockCard` · `StepBlocks`) |
 * | `useModalTarget` | 대상이 있어야 열리는 모달 (`체크리스트 항목 삭제` — 어느 항목인지) |
 *
 * 반환값은 모두 **참조가 고정**돼 있다. `BlockCard` 처럼 `memo` 로 감싼 자식에
 * 그대로 넘겨도 매 렌더 다시 그려지지 않는다.
 */
export interface Modal {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/** 모달 하나 — `useState(false)` + 여닫이 두 개를 묶은 것이다 */
export function useModal(initial = false): Modal {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
}

export interface ModalRouter<Name extends string> {
  /** 지금 열려 있는 것 — 없으면 `null` */
  openName: Name | null;
  open: (name: Name) => void;
  close: () => void;
  isOpen: (name: Name) => boolean;
}

/**
 * 여러 모달 중 **하나만** 열리게 한다.
 *
 * 불리언을 따로 두면 `isEditing` 과 `isDeleting` 이 동시에 참인 상태를 타입이 막지 못한다.
 * 실제로 그렇게 되면 모달 두 개가 겹쳐 뜨고, 뒤쪽 `<dialog>` 는 포커스를 빼앗긴 채 남는다.
 * 열린 것을 **이름 하나**로 들면 그 상태 자체가 만들어지지 않는다.
 *
 * ```tsx
 * type Panel = 'issues' | 'logs';
 * const panel = useModalRouter<Panel>();
 * <button onClick={() => panel.open('issues')} />
 * {panel.isOpen('issues') && <BlockIssuesPanel onClose={panel.close} />}
 * ```
 */
export function useModalRouter<Name extends string>(
  /** 처음부터 열어둘 것 — 생성 직후 곧바로 띄우는 경우에 쓴다 (`ImageBlock` 의 `autoUpload`) */
  initial: Name | null = null,
): ModalRouter<Name> {
  const [openName, setOpenName] = useState<Name | null>(initial);

  const open = useCallback((name: Name) => setOpenName(name), []);
  const close = useCallback(() => setOpenName(null), []);
  const isOpen = useCallback((name: Name) => openName === name, [openName]);

  return useMemo(
    () => ({ openName, open, close, isOpen }),
    [openName, open, close, isOpen],
  );
}

export interface ModalTarget<T> {
  /** 모달을 띄운 대상 — 없으면 닫힌 상태다 */
  target: T | null;
  open: (target: T) => void;
  close: () => void;
}

/**
 * 대상을 들고 여는 모달. "무엇을" 지울지 · 고칠지가 있어야 뜨는 경우에 쓴다.
 *
 * 불리언과 대상을 따로 두면 `isOpen === true` 인데 대상이 `null` 인 상태가 생기고,
 * 그때 모달은 빈 이름으로 그려진다. 대상 하나로 여닫이까지 대신하면 그럴 일이 없다.
 */
export function useModalTarget<T>(): ModalTarget<T> {
  const [target, setTarget] = useState<T | null>(null);

  const open = useCallback((next: T) => setTarget(next), []);
  const close = useCallback(() => setTarget(null), []);

  return useMemo(() => ({ target, open, close }), [target, open, close]);
}
