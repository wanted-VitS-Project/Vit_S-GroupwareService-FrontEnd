'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface RowMenuItem {
  label: string;
  /** 삭제처럼 되돌리기 어려운 항목은 빨갛게 */
  danger?: boolean;
  onSelect: () => void;
}

interface RowMenuProps {
  /** 스크린리더용 — '{label} 관리' 로 읽힌다 */
  label: string;
  items: RowMenuItem[];
  /** 항목 문구가 길면 넓힌다 (px) */
  width?: number;
}

/** 펼침 방향을 계산하려면 높이를 미리 알아야 한다 */
const ITEM_HEIGHT = 27;
const MENU_PADDING = 8;
const DEFAULT_WIDTH = 96;

/**
 * 표 행별 케밥 메뉴. 바깥 클릭 · ESC 로 닫는다.
 *
 * 스크롤 영역 안에서 잘리지 않도록 body 에 `fixed` 로 띄운다.
 * 좌표는 열 때 한 번 계산해 굳으므로 스크롤 · 리사이즈가 생기면 닫는다.
 */
export default function RowMenu({
  label,
  items,
  width = DEFAULT_WIDTH,
}: RowMenuProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const isOpen = position !== null;
  const height = items.length * ITEM_HEIGHT + MENU_PADDING;

  /** 닫을 때는 트리거로 포커스를 되돌린다 — 키보드 사용자가 행을 잃지 않게 */
  function close() {
    setPosition(null);
    buttonRef.current?.focus();
  }

  function toggle() {
    if (isOpen) {
      close();
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 화면 아래쪽이면 위로 펼친다
    const opensUp = window.innerHeight - rect.bottom < height + 8;

    setPosition({
      top: opensUp ? rect.top - height - 4 : rect.bottom + 4,
      left: rect.right - width,
    });
  }

  useEffect(() => {
    if (!isOpen) return;

    // 열자마자 첫 항목으로 옮긴다 — 메뉴가 body 에 있어 Tab 으로는 닿지 않는다
    firstItemRef.current?.focus();

    /** 바깥 조작으로 닫을 때는 포커스를 옮기지 않는다 — 사용자가 이미 다른 곳을 보고 있다 */
    function dismiss() {
      setPosition(null);
    }
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        dismiss();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      setPosition(null);
      buttonRef.current?.focus();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    // 스크롤은 표 안쪽에서도 일어나므로 캡처 단계에서 받는다
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`${label} 관리`}
        aria-expanded={isOpen}
        className="cursor-pointer rounded px-2 py-1 text-text-secondary hover:bg-bg-hover"
      >
        ⋯
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width }}
            className="fixed z-50 overflow-hidden rounded-lg border border-border-default bg-white py-1 shadow-lg"
          >
            {items.map((item, index) => (
              <button
                key={item.label}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={`block w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-bg-hover ${
                  item.danger ? 'text-text-danger' : 'text-text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
